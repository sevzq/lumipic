export type SniffedFormat =
  | "jpeg"
  | "png"
  | "webp"
  | "avif"
  | "gif"
  | "heic"
  | "bmp"
  | "svg"
  | "unknown";

/** Detect image format from magic bytes (never trust file extensions). */
export function sniffFormat(bytes: Uint8Array): SniffedFormat {
  const ascii = (o: number, len: number) =>
    String.fromCharCode(...bytes.subarray(o, o + len));

  if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpeg";
  if (bytes[0] === 0x89 && ascii(1, 3) === "PNG") return "png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "webp";
  if (ascii(0, 3) === "GIF") return "gif";
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) return "bmp";
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand.startsWith("avi")) return "avif";
    if (["heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "mif1", "msf1"].includes(brand))
      return "heic";
  }
  const head = ascii(0, Math.min(256, bytes.length));
  if (head.includes("<svg") || (head.startsWith("<?xml") && head.includes("svg")))
    return "svg";
  return "unknown";
}

export const FORMAT_MIME: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
  heic: "image/heic",
  bmp: "image/bmp",
  svg: "image/svg+xml",
};

export const ACCEPTED_INPUT =
  "image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp,image/heic,image/heif,.heic,.heif,.jpg,.jpeg,.png,.webp,.avif,.gif,.bmp";

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/** Compact variant for tight UI slots ("2.8 MB", "832 KB"). */
export function formatBytesShort(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) {
    const kb = n / 1024;
    return `${kb >= 100 ? Math.round(kb) : kb.toFixed(1)} KB`;
  }
  const mb = n / (1024 * 1024);
  return `${mb >= 100 ? Math.round(mb) : mb.toFixed(1)} MB`;
}
