/**
 * Lossless metadata stripping. Rewrites the container, never re-encodes pixels,
 * so image quality is byte-identical.
 *
 * Supported: JPEG (APPn segments), PNG (ancillary text/exif chunks),
 * WebP (RIFF EXIF/XMP chunks).
 */

const KEEP_ICC = true;

/** JPEG: drop APP1 (EXIF/XMP), APP2 (non-ICC), APP13 (IPTC), COM segments. */
export function stripJpeg(buf: ArrayBuffer): ArrayBuffer {
  const data = new Uint8Array(buf);
  if (data[0] !== 0xff || data[1] !== 0xd8) throw new Error("not a JPEG");

  const parts: Uint8Array[] = [data.subarray(0, 2)];
  let offset = 2;

  while (offset < data.length) {
    if (data[offset] !== 0xff) break; // entropy-coded data reached unexpectedly
    const marker = data[offset + 1];

    // Start of scan: keep everything from here to EOF (compressed image data)
    if (marker === 0xda) {
      parts.push(data.subarray(offset));
      break;
    }
    // Standalone markers without length
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      parts.push(data.subarray(offset, offset + 2));
      offset += 2;
      continue;
    }

    const len = (data[offset + 2] << 8) | data[offset + 3];
    const segEnd = offset + 2 + len;
    let drop = false;

    if (marker === 0xfe) drop = true; // COM
    if (marker >= 0xe1 && marker <= 0xef) {
      // APP1..APP15 — drop unless it's ICC profile data we want to keep
      drop = true;
      if (KEEP_ICC && marker === 0xe2) {
        const sig = String.fromCharCode(...data.subarray(offset + 4, offset + 15));
        if (sig.startsWith("ICC_PROFILE")) drop = false;
      }
    }

    if (!drop) parts.push(data.subarray(offset, segEnd));
    offset = segEnd;
  }

  return concat(parts);
}

const PNG_DROP = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME", "pHYs"]);

/** PNG: drop textual/EXIF ancillary chunks; critical chunks untouched. */
export function stripPng(buf: ArrayBuffer): ArrayBuffer {
  const data = new Uint8Array(buf);
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!sig.every((b, i) => data[i] === b)) throw new Error("not a PNG");

  const view = new DataView(buf);
  const parts: Uint8Array[] = [data.subarray(0, 8)];
  let offset = 8;

  while (offset + 8 <= data.length) {
    const len = view.getUint32(offset);
    const type = String.fromCharCode(...data.subarray(offset + 4, offset + 8));
    const chunkEnd = offset + 12 + len;
    if (!PNG_DROP.has(type)) parts.push(data.subarray(offset, chunkEnd));
    offset = chunkEnd;
    if (type === "IEND") break;
  }

  return concat(parts);
}

const WEBP_DROP = new Set(["EXIF", "XMP "]);

/** WebP: drop EXIF/XMP RIFF chunks and clear the corresponding VP8X flags. */
export function stripWebp(buf: ArrayBuffer): ArrayBuffer {
  const data = new Uint8Array(buf);
  const tag = (o: number) => String.fromCharCode(...data.subarray(o, o + 4));
  if (tag(0) !== "RIFF" || tag(8) !== "WEBP") throw new Error("not a WebP");

  const view = new DataView(buf);
  const parts: Uint8Array[] = [];
  let offset = 12;

  while (offset + 8 <= data.length) {
    const type = tag(offset);
    const len = view.getUint32(offset + 4, true);
    const padded = len + (len % 2); // chunks are 2-byte aligned
    const chunkEnd = offset + 8 + padded;
    if (!WEBP_DROP.has(type)) {
      const chunk = data.slice(offset, chunkEnd);
      if (type === "VP8X") chunk[8] &= ~0b0000_1100; // clear EXIF+XMP bits
      parts.push(chunk);
    }
    offset = chunkEnd;
  }

  const body = concat(parts);
  const out = new Uint8Array(12 + body.byteLength);
  out.set(data.subarray(0, 12));
  out.set(new Uint8Array(body), 12);
  new DataView(out.buffer).setUint32(4, out.byteLength - 8, true);
  return out.buffer;
}

function concat(parts: Uint8Array[]): ArrayBuffer {
  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.byteLength;
  }
  return out.buffer;
}
