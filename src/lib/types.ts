export type ToolMode =
  | "remove-bg"
  | "compress"
  | "convert"
  | "crop"
  | "strip-exif";

export type OutputFormat = "png" | "jpeg" | "webp" | "avif";

export type FileStatus = "ready" | "queued" | "processing" | "done" | "error";

export interface CompressSettings {
  /** 1-100, higher = better quality */
  quality: number;
  /** For PNG: palette quantization (TinyPNG-style smart lossy) */
  pngLossy: boolean;
}

export interface ConvertSettings {
  format: OutputFormat;
  quality: number;
}

export interface StudioSettings {
  compress: CompressSettings;
  convert: ConvertSettings;
}

/** Per-file crop parameters, in rotated-image pixel space. */
export interface CropParams {
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
}

export interface ProcessResult {
  blob: Blob;
  bytes: number;
  width: number;
  height: number;
  /** file extension of the output, e.g. "png" */
  ext: string;
}

export interface StudioFile {
  id: string;
  file: File;
  name: string;
  bytes: number;
  /** object URL for the preview thumbnail */
  previewUrl: string | null;
  width: number;
  height: number;
  status: FileStatus;
  /** 0-1 while processing */
  progress: number;
  result: (ProcessResult & { url: string }) | null;
  error: string | null;
  /** set by the crop editor before processing (crop tool only) */
  crop: CropParams | null;
}

/** Which BiRefNet variant is active: hd = 1024px, lite = 512px fallback. */
export type BgTier = "hd" | "lite";

export type BgEngineState =
  | { kind: "idle" }
  | { kind: "loading"; progress: number }
  | { kind: "ready"; device: "webgpu" | "wasm"; tier: BgTier }
  | { kind: "unavailable"; reason: string };

export interface PipelineJob {
  mode: ToolMode;
  settings: StudioSettings;
  /** original file format mime, used by compress to keep format */
  sourceMime: string;
}
