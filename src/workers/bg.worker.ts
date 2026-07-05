/// <reference lib="webworker" />
/**
 * Background-removal worker.
 *
 * Runs BiRefNet_lite (SOTA dichotomous segmentation, MIT) fully on-device via
 * transformers.js + WebGPU. The model is self-hosted under /models/ and the
 * ONNX runtime under /ort/ — no third-party CDN, no uploads.
 *
 * Pipeline: model mask (512px) -> guided-filter refinement at the original
 * resolution (recovers hair / fine edges) -> RGBA output.
 *
 * Why 512 and not 1024: the 1024 graph is blocked in browsers by two
 * independent walls — a >10 storage-buffer shader that macOS Metal rejects,
 * and (on every OS) ScatterND/GatherND ops that fall back to CPU WASM and
 * exhaust the 32-bit heap at 1024² (std::bad_alloc, reproduced even in
 * Safari with a 44-buffer adapter). The 512 re-export (max 7 buffers) runs
 * on every WebGPU adapter, and the full-resolution guided filter closes
 * most of the visual gap.
 */
import { expose, transfer } from "comlink";
import { refineAlpha } from "@/lib/guided-filter";

export type BgDevice = "webgpu" | "unavailable";

export interface BgInitResult {
  device: BgDevice;
  reason?: string;
}

type Segmenter = (input: unknown) => Promise<unknown>;

let segmenterPromise: Promise<Segmenter> | null = null;
let device: BgDevice = "unavailable";

const MODEL_ID = "BiRefNet_lite_512";

async function detectWebGpu(): Promise<boolean> {
  try {
    const nav = navigator as Navigator & {
      gpu?: { requestAdapter(): Promise<unknown | null> };
    };
    if (!nav.gpu) return false;
    return (await nav.gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

async function createSegmenter(
  onProgress: (p: number) => void,
): Promise<Segmenter> {
  const { env, pipeline } = await import("@huggingface/transformers");

  // Fully self-hosted: models and WASM runtime come from our own origin.
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = "/models/";
  if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.wasmPaths = "/ort/";
  }

  const segmenter = (await pipeline("background-removal", MODEL_ID, {
    device: "webgpu",
    dtype: "fp16",
    progress_callback: (info: {
      status: string;
      file?: string;
      progress?: number;
    }) => {
      if (info.status === "progress" && info.file?.endsWith(".onnx")) {
        onProgress(Math.min(0.99, (info.progress ?? 0) / 100));
      }
    },
  })) as unknown as Segmenter;
  return segmenter;
}

const api = {
  async init(onProgress: (p: number) => void): Promise<BgInitResult> {
    if (!(await detectWebGpu())) {
      device = "unavailable";
      return { device, reason: "no-webgpu" };
    }
    if (!segmenterPromise) {
      segmenterPromise = createSegmenter(onProgress).catch((err) => {
        segmenterPromise = null;
        throw err;
      });
    }
    await segmenterPromise;
    device = "webgpu";
    onProgress(1);
    return { device };
  },

  /**
   * Remove the background of an RGBA image. Returns RGBA with transparent bg.
   */
  async removeBackground(
    data: ArrayBuffer,
    width: number,
    height: number,
  ): Promise<{ data: ArrayBuffer; width: number; height: number }> {
    if (!segmenterPromise) throw new Error("engine not initialized");
    const segmenter = await segmenterPromise;

    const { RawImage } = await import("@huggingface/transformers");
    const input = new RawImage(new Uint8ClampedArray(data), width, height, 4);

    const result = await segmenter(input);
    const out = (Array.isArray(result) ? result[0] : result) as {
      data: Uint8ClampedArray | Uint8Array;
      width: number;
      height: number;
      channels: number;
    };

    // Extract the model's alpha matte at full resolution.
    const alpha = new Uint8ClampedArray(width * height);
    if (out.channels === 4) {
      for (let i = 0, p = 3; i < alpha.length; i++, p += 4) alpha[i] = out.data[p];
    } else {
      alpha.set(out.data.subarray(0, alpha.length));
    }

    // Snap the matte onto true image edges (hair, fur, fine structures).
    const original = new Uint8ClampedArray(data);
    const refined = refineAlpha(original, alpha, width, height);

    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0, p = 0; i < refined.length; i++, p += 4) {
      rgba[p] = original[p];
      rgba[p + 1] = original[p + 1];
      rgba[p + 2] = original[p + 2];
      rgba[p + 3] = refined[i];
    }

    const buf = rgba.buffer as ArrayBuffer;
    return transfer({ data: buf, width, height }, [buf]);
  },
};

export type BgWorkerApi = typeof api;

expose(api);
