/// <reference lib="webworker" />
/**
 * Image codec worker: decode, compress, convert, crop, EXIF-strip.
 * Everything runs on WASM (Squoosh codecs) — pixels never leave the device.
 */
import { expose, transfer } from "comlink";
import { sniffFormat, type SniffedFormat } from "@/lib/sniff";
import { stripJpeg, stripPng, stripWebp } from "@/lib/exif";
import type {
  CompressSettings,
  ConvertSettings,
  CropParams,
  OutputFormat,
} from "@/lib/types";

export interface DecodedImage {
  data: ArrayBuffer; // RGBA
  width: number;
  height: number;
  format: SniffedFormat;
}

export interface EncodedImage {
  data: ArrayBuffer;
  mime: string;
  ext: string;
  width: number;
  height: number;
}

// ---------------------------------------------------------------- decoding

async function nativeDecode(blob: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

async function wasmDecode(
  format: SniffedFormat,
  buf: ArrayBuffer,
): Promise<ImageData> {
  switch (format) {
    case "jpeg": {
      const { default: decode } = await import("@jsquash/jpeg/decode");
      return decode(buf);
    }
    case "png": {
      const { default: decode } = await import("@jsquash/png/decode");
      return decode(buf);
    }
    case "webp": {
      const { default: decode } = await import("@jsquash/webp/decode");
      return decode(buf);
    }
    case "avif": {
      const { default: decode } = await import("@jsquash/avif/decode");
      const out = await decode(buf);
      if (!out) throw new Error("AVIF decode failed");
      return out as ImageData;
    }
    default:
      throw new Error(`unsupported format: ${format}`);
  }
}

async function heicDecode(buf: ArrayBuffer): Promise<ImageData> {
  const { default: decode } = await import("heic-decode");
  const { width, height, data } = await decode({ buffer: new Uint8Array(buf) });
  return new ImageData(new Uint8ClampedArray(data), width, height);
}

async function decodeToImageData(
  file: Blob,
): Promise<{ img: ImageData; format: SniffedFormat }> {
  const buf = await file.arrayBuffer();
  const format = sniffFormat(new Uint8Array(buf));

  if (format === "heic") {
    try {
      return { img: await nativeDecode(file) /* Safari decodes HEIC */, format };
    } catch {
      return { img: await heicDecode(buf), format };
    }
  }

  try {
    return { img: await nativeDecode(file), format };
  } catch {
    return { img: await wasmDecode(format, buf), format };
  }
}

// ---------------------------------------------------------------- encoding

async function encodePng(
  img: ImageData,
  opts: { lossy: boolean; quality: number },
): Promise<ArrayBuffer> {
  let source = img;

  if (opts.lossy) {
    // TinyPNG-style: palette quantization with dithering, then oxipng.
    const { buildPalette, applyPalette, utils } = await import("image-q");
    const point = utils.PointContainer.fromUint8Array(
      new Uint8Array(img.data.buffer.slice(0)),
      img.width,
      img.height,
    );
    const colors = Math.max(32, Math.round((opts.quality / 100) * 256));
    const palette = await buildPalette([point], {
      colorDistanceFormula: "euclidean-bt709",
      paletteQuantization: "wuquant",
      colors,
    });
    const quantized = await applyPalette(point, palette, {
      colorDistanceFormula: "euclidean-bt709",
      imageQuantization: "floyd-steinberg",
    });
    source = new ImageData(
      new Uint8ClampedArray(quantized.toUint8Array()),
      img.width,
      img.height,
    );
  }

  const { default: encode } = await import("@jsquash/png/encode");
  const raw = await encode(source);

  const megapixels = (img.width * img.height) / 1_000_000;
  const { default: optimise } = await import("@jsquash/oxipng/optimise");
  return optimise(raw, { level: megapixels > 6 ? 1 : 2 });
}

async function encodeAs(
  img: ImageData,
  format: OutputFormat,
  quality: number,
  pngLossy = false,
): Promise<EncodedImage> {
  let data: ArrayBuffer;
  switch (format) {
    case "png":
      data = await encodePng(img, { lossy: pngLossy, quality });
      break;
    case "jpeg": {
      const { default: encode } = await import("@jsquash/jpeg/encode");
      data = await encode(img, { quality });
      break;
    }
    case "webp": {
      const { default: encode } = await import("@jsquash/webp/encode");
      data = await encode(img, { quality });
      break;
    }
    case "avif": {
      const { default: encode } = await import("@jsquash/avif/encode");
      const megapixels = (img.width * img.height) / 1_000_000;
      data = await encode(img, { quality, speed: megapixels > 4 ? 8 : 6 });
      break;
    }
  }
  return {
    data,
    mime: `image/${format}`,
    ext: format === "jpeg" ? "jpg" : format,
    width: img.width,
    height: img.height,
  };
}

function hasAlpha(img: ImageData): boolean {
  const d = img.data;
  for (let i = 3; i < d.length; i += 64 * 4 + 3) {
    if (d[i] < 255) return true;
  }
  return false;
}

/** Which format "compress in place" maps to for a given source. */
function compressTarget(format: SniffedFormat, img: ImageData): OutputFormat {
  switch (format) {
    case "jpeg":
      return "jpeg";
    case "png":
      return "png";
    case "webp":
      return "webp";
    case "avif":
      return "avif";
    default:
      return hasAlpha(img) ? "png" : "jpeg";
  }
}

// ------------------------------------------------------------------- API

const api = {
  /** Decode for previews / cross-worker handoff. Returns transferable RGBA. */
  async decode(file: Blob): Promise<DecodedImage> {
    const { img, format } = await decodeToImageData(file);
    const buf = img.data.buffer as ArrayBuffer;
    return transfer(
      { data: buf, width: img.width, height: img.height, format },
      [buf],
    );
  },

  async compress(file: Blob, settings: CompressSettings): Promise<EncodedImage> {
    const { img, format } = await decodeToImageData(file);
    const target = compressTarget(format, img);
    const out = await encodeAs(
      img,
      target,
      settings.quality,
      target === "png" && settings.pngLossy,
    );
    return transfer(out, [out.data]);
  },

  async convert(file: Blob, settings: ConvertSettings): Promise<EncodedImage> {
    const { img } = await decodeToImageData(file);
    const out = await encodeAs(img, settings.format, settings.quality);
    return transfer(out, [out.data]);
  },

  /**
   * Crop (with optional 90°-step rotation and horizontal flip), saved in the
   * source format: PNG stays PNG (alpha-less PNG stays alpha-less via oxipng
   * color-type reduction), JPEG/WebP/AVIF re-encode at quality 92.
   */
  async cropImage(file: Blob, params: CropParams): Promise<EncodedImage> {
    const { img, format } = await decodeToImageData(file);

    // Orient first: view = flipH ∘ rotate (matches the editor's order).
    const quarter = params.rotate === 90 || params.rotate === 270;
    const ow = quarter ? img.height : img.width;
    const oh = quarter ? img.width : img.height;

    const canvas = new OffscreenCanvas(ow, oh);
    const ctx = canvas.getContext("2d")!;
    ctx.translate(ow / 2, oh / 2);
    if (params.flipH) ctx.scale(-1, 1);
    ctx.rotate((params.rotate * Math.PI) / 180);
    const bmp = await createImageBitmap(img);
    ctx.drawImage(bmp, -img.width / 2, -img.height / 2);
    bmp.close();

    const x = Math.max(0, Math.min(Math.round(params.x), ow - 1));
    const y = Math.max(0, Math.min(Math.round(params.y), oh - 1));
    const w = Math.max(1, Math.min(Math.round(params.w), ow - x));
    const h = Math.max(1, Math.min(Math.round(params.h), oh - y));
    const cropped = ctx.getImageData(x, y, w, h);

    const target = compressTarget(format, cropped);
    const out = await encodeAs(cropped, target, 92);
    return transfer(out, [out.data]);
  },

  /** Lossless metadata removal — pixels are untouched. */
  async stripExif(file: Blob): Promise<EncodedImage> {
    const buf = await file.arrayBuffer();
    const format = sniffFormat(new Uint8Array(buf));

    let data: ArrayBuffer;
    if (format === "jpeg") data = stripJpeg(buf);
    else if (format === "png") data = stripPng(buf);
    else if (format === "webp") data = stripWebp(buf);
    else throw new Error("UNSUPPORTED_LOSSLESS");

    const out: EncodedImage = {
      data,
      mime: `image/${format}`,
      ext: format === "jpeg" ? "jpg" : format,
      width: 0,
      height: 0,
    };
    return transfer(out, [out.data]);
  },

  /** Encode RGBA pixels (e.g. matte output from the bg worker) to PNG. */
  async encodeRgbaToPng(
    data: ArrayBuffer,
    width: number,
    height: number,
  ): Promise<EncodedImage> {
    const img = new ImageData(new Uint8ClampedArray(data), width, height);
    const out = await encodeAs(img, "png", 100);
    return transfer(out, [out.data]);
  },
};

export type ImageWorkerApi = typeof api;

expose(api);
