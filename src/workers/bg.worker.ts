/// <reference lib="webworker" />
/**
 * Background-removal worker.
 *
 * Runs BiRefNet_lite (SOTA dichotomous segmentation, MIT) fully on-device via
 * transformers.js + WebGPU. The model is self-hosted under /models/ and the
 * ONNX runtime under /ort/ — no third-party CDN, no uploads.
 *
 * Pipeline: model mask (1024px) -> guided-filter refinement at the original
 * resolution (recovers hair / fine edges) -> RGBA output.
 */
import { expose, transfer } from "comlink";
import { refineAlpha } from "@/lib/guided-filter";

export type BgDevice = "webgpu" | "unavailable";
export type BgTier = "hd" | "lite";

export interface BgInitResult {
  device: BgDevice;
  tier?: BgTier;
  reason?: string;
}

type Segmenter = (input: unknown) => Promise<unknown>;

let segmenterPromise: Promise<Segmenter> | null = null;
let device: BgDevice = "unavailable";

/**
 * BiRefNet_lite's 1024px graph needs 11 storage buffers per shader stage;
 * adapters capped at 10 (e.g. Dawn/Metal before Chrome 146) reject it. For
 * those we load the 512px re-export (max 7 buffers, works everywhere). The
 * guided-filter refinement afterwards runs at the original resolution either
 * way, so edge quality stays high.
 */
const MODEL_FULL = "BiRefNet_lite";
const MODEL_SAFE = "BiRefNet_lite_512";
let modelId = MODEL_FULL;

interface GpuAdapterLike {
  limits?: { maxStorageBuffersPerShaderStage?: number };
}

async function detectWebGpu(): Promise<boolean> {
  try {
    const nav = navigator as Navigator & {
      gpu?: { requestAdapter(): Promise<GpuAdapterLike | null> };
    };
    if (!nav.gpu) return false;
    const adapter = await nav.gpu.requestAdapter();
    if (!adapter) return false;
    const maxStorage = adapter.limits?.maxStorageBuffersPerShaderStage ?? 8;
    modelId = maxStorage >= 11 ? MODEL_FULL : MODEL_SAFE;
    return true;
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

  const segmenter = (await pipeline("background-removal", modelId, {
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
    return { device, tier: modelId === MODEL_FULL ? "hd" : "lite" };
  },

  /** The tier can downgrade at runtime (storage-buffer fallback). */
  currentTier(): BgTier {
    return modelId === MODEL_FULL ? "hd" : "lite";
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

    // Adapters that pass the storage-buffer check can still fail on the
    // 1024px graph — e.g. Safari throws `std::bad_alloc` (OOM) at inference
    // time. Any such failure downgrades to the 512px model once and retries.
    const recoverable =
      /storage buffers?|bad_alloc|out of memory|allocation failed|ERROR_CODE: 6/i;

    let result: unknown;
    try {
      result = await segmenter(input);
    } catch (err) {
      if (modelId !== MODEL_SAFE && recoverable.test(String(err))) {
        modelId = MODEL_SAFE;
        // Free the failed pipeline's GPU/WASM memory before loading the
        // smaller model — critical on Safari where we just hit OOM.
        try {
          await (segmenter as { dispose?: () => Promise<void> }).dispose?.();
        } catch {
          /* best-effort */
        }
        segmenterPromise = createSegmenter(() => {});
        const safe = await segmenterPromise;
        result = await safe(input);
      } else {
        throw err;
      }
    }
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
