"use client";

import { create } from "zustand";
import { getBgWorker, getImageWorker, workerProxy } from "@/lib/workers";
import { sniffFormat } from "@/lib/sniff";
import type {
  BgEngineState,
  CropParams,
  ProcessResult,
  StudioFile,
  StudioSettings,
  ToolMode,
} from "@/lib/types";

const DEFAULT_SETTINGS: StudioSettings = {
  // quality 50 == the slider's default "strength 50" midpoint
  compress: { quality: 50, pngLossy: true },
  convert: { format: "webp", quality: 82 },
};

const MAX_FILES = 60;
const MAX_BYTES = 80 * 1024 * 1024;

interface StudioState {
  mode: ToolMode;
  files: StudioFile[];
  settings: StudioSettings;
  engine: BgEngineState;
  selectedId: string | null;

  setMode(mode: ToolMode): void;
  addFiles(files: File[], opts?: { process?: boolean }): { rejected: number };
  removeFile(id: string): void;
  clearAll(): void;
  selectFile(id: string | null): void;
  updateSettings(patch: Partial<StudioSettings>): void;
  reprocessAll(): void;
  /** Run every pending ("ready") file — used after switching tools. */
  startAll(): void;
  initEngine(): Promise<void>;
  applyCrop(id: string, params: CropParams): void;
  resetCrop(id: string): void;
}

let uid = 0;
const nextId = () => `f${++uid}-${Date.now().toString(36)}`;

/** Bumped on every tool switch so stale in-flight jobs can't write results. */
let jobEpoch = 0;

// ---------------------------------------------------------------- queue

type Task = () => Promise<void>;

function createQueue(concurrency: number) {
  const pending: Task[] = [];
  let active = 0;
  const pump = () => {
    while (active < concurrency && pending.length > 0) {
      const task = pending.shift()!;
      active++;
      task().finally(() => {
        active--;
        pump();
      });
    }
  };
  return (task: Task) => {
    pending.push(task);
    pump();
  };
}

const enqueueImage = createQueue(2);
const enqueueBg = createQueue(1);

// ------------------------------------------------------------- processing

async function runJob(
  file: File,
  mode: ToolMode,
  settings: StudioSettings,
  crop: CropParams | null,
  onStage: (progress: number) => void,
): Promise<ProcessResult> {
  const img = getImageWorker();
  onStage(0.15);

  let out: {
    data: ArrayBuffer;
    mime: string;
    ext: string;
    width: number;
    height: number;
  };

  if (mode === "remove-bg") {
    const decoded = await img.decode(file);
    onStage(0.35);
    const bg = getBgWorker();
    const matte = await bg.removeBackground(
      decoded.data,
      decoded.width,
      decoded.height,
    );
    onStage(0.75);
    out = await img.encodeRgbaToPng(matte.data, matte.width, matte.height);
  } else if (mode === "compress") {
    out = await img.compress(file, settings.compress);
  } else if (mode === "convert") {
    out = await img.convert(file, settings.convert);
  } else if (mode === "crop") {
    if (!crop) throw new Error("missing crop params");
    out = await img.cropImage(file, crop);
  } else {
    out = await img.stripExif(file);
  }

  onStage(0.95);
  const blob = new Blob([out.data], { type: out.mime });
  return {
    blob,
    bytes: blob.size,
    width: out.width,
    height: out.height,
    ext: out.ext,
  };
}

// ---------------------------------------------------------------- store

export const useStudio = create<StudioState>((set, get) => {
  const patchFile = (id: string, patch: Partial<StudioFile>) => {
    set((s) => ({
      files: s.files.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const scheduleFile = (id: string) => {
    const { mode } = get();
    const epoch = jobEpoch;

    // Crop is interactive: wait until the user draws a rectangle.
    if (mode === "crop" && !get().files.find((f) => f.id === id)?.crop) {
      patchFile(id, { status: "ready", progress: 0, error: null });
      return;
    }

    patchFile(id, { status: "queued", progress: 0, error: null });

    const enqueue = mode === "remove-bg" ? enqueueBg : enqueueImage;
    enqueue(async () => {
      if (epoch !== jobEpoch) return; // tool switched since queueing
      const sf = get().files.find((f) => f.id === id);
      if (!sf || sf.status !== "queued") return;

      if (mode === "remove-bg") {
        await get().initEngine();
        if (epoch !== jobEpoch) return;
        if (get().engine.kind !== "ready") {
          patchFile(id, { status: "error", error: "engine" });
          return;
        }
      }

      patchFile(id, { status: "processing", progress: 0.05 });
      try {
        const result = await runJob(sf.file, mode, get().settings, sf.crop, (p) => {
          if (epoch === jobEpoch) patchFile(id, { progress: p });
        });
        if (epoch !== jobEpoch) return; // result belongs to the previous tool
        const old = get().files.find((f) => f.id === id)?.result;
        if (old) URL.revokeObjectURL(old.url);
        patchFile(id, {
          status: "done",
          progress: 1,
          result: { ...result, url: URL.createObjectURL(result.blob) },
        });
        if (mode === "remove-bg") void syncTier();
      } catch (err) {
        if (epoch !== jobEpoch) return;
        const message = err instanceof Error ? err.message : String(err);
        patchFile(id, {
          status: "error",
          error: message === "UNSUPPORTED_LOSSLESS" ? "unsupportedLossless" : "generic",
        });
        console.error("[lumipic] process failed:", err);
      }
    });
  };

  /** The worker may downgrade 1024 -> 512 mid-run; reflect it in the UI. */
  const syncTier = async () => {
    try {
      const tier = await getBgWorker().currentTier();
      const engine = get().engine;
      if (engine.kind === "ready" && engine.tier !== tier) {
        set({ engine: { ...engine, tier } });
      }
    } catch {
      /* cosmetic only */
    }
  };

  let reprocessTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    mode: "remove-bg",
    files: [],
    settings: DEFAULT_SETTINGS,
    engine: { kind: "idle" },
    selectedId: null,

    setMode(mode) {
      if (get().mode === mode) return;
      // Switching tools never auto-runs: in-flight jobs are invalidated and
      // every file returns to "ready" until the user hits start.
      jobEpoch++;
      set({ mode });
      for (const f of get().files) {
        if (f.result) URL.revokeObjectURL(f.result.url);
        patchFile(f.id, {
          status: "ready",
          progress: 0,
          result: null,
          error: null,
        });
      }
    },

    addFiles(incoming, opts) {
      const existing = get().files.length;
      let rejected = 0;

      const accepted: StudioFile[] = [];
      for (const file of incoming) {
        if (existing + accepted.length >= MAX_FILES) {
          rejected++;
          continue;
        }
        if (file.size > MAX_BYTES || file.size === 0) {
          rejected++;
          continue;
        }
        const id = nextId();
        accepted.push({
          id,
          file,
          name: file.name,
          bytes: file.size,
          previewUrl: URL.createObjectURL(file),
          width: 0,
          height: 0,
          status: "ready",
          progress: 0,
          result: null,
          error: null,
          crop: null,
        });
      }

      if (accepted.length > 0) {
        set((s) => ({
          files: [...s.files, ...accepted],
          selectedId: s.selectedId ?? accepted[0].id,
        }));
        for (const sf of accepted) {
          hydratePreview(sf, patchFile);
          if (opts?.process !== false) scheduleFile(sf.id);
        }
      }
      return { rejected };
    },

    removeFile(id) {
      const f = get().files.find((x) => x.id === id);
      if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
      if (f?.result) URL.revokeObjectURL(f.result.url);
      set((s) => ({
        files: s.files.filter((x) => x.id !== id),
        selectedId:
          s.selectedId === id
            ? (s.files.find((x) => x.id !== id)?.id ?? null)
            : s.selectedId,
      }));
    },

    clearAll() {
      for (const f of get().files) {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        if (f.result) URL.revokeObjectURL(f.result.url);
      }
      set({ files: [], selectedId: null });
    },

    selectFile(id) {
      set({ selectedId: id });
    },

    updateSettings(patch) {
      set((s) => ({
        settings: {
          compress: { ...s.settings.compress, ...patch.compress },
          convert: { ...s.settings.convert, ...patch.convert },
        },
      }));
      if (reprocessTimer) clearTimeout(reprocessTimer);
      reprocessTimer = setTimeout(() => get().reprocessAll(), 550);
    },

    reprocessAll() {
      const mode = get().mode;
      // Settings only affect these tools; remove-bg / strip-exif have none.
      if (mode === "remove-bg" || mode === "strip-exif") return;
      for (const f of get().files) {
        if (f.status === "done" || f.status === "error") scheduleFile(f.id);
      }
    },

    startAll() {
      for (const f of get().files) {
        if (f.status === "ready" || f.status === "error") scheduleFile(f.id);
      }
    },

    applyCrop(id, params) {
      patchFile(id, { crop: params });
      scheduleFile(id);
    },

    resetCrop(id) {
      const f = get().files.find((x) => x.id === id);
      if (f?.result) URL.revokeObjectURL(f.result.url);
      patchFile(id, { crop: null, result: null, status: "ready", progress: 0 });
    },

    async initEngine() {
      const { engine } = get();
      if (engine.kind === "ready" || engine.kind === "loading") {
        // Wait for an in-flight load to settle.
        while (get().engine.kind === "loading") {
          await new Promise((r) => setTimeout(r, 120));
        }
        return;
      }
      set({ engine: { kind: "loading", progress: 0 } });
      try {
        const bg = getBgWorker();
        const res = await bg.init(
          workerProxy((p: number) => {
            if (get().engine.kind === "loading") {
              set({ engine: { kind: "loading", progress: p } });
            }
          }),
        );
        set({
          engine:
            res.device === "webgpu"
              ? { kind: "ready", device: "webgpu", tier: res.tier ?? "lite" }
              : { kind: "unavailable", reason: res.reason ?? "no-webgpu" },
        });
      } catch (err) {
        console.error("[lumipic] engine init failed:", err);
        set({ engine: { kind: "unavailable", reason: "load-failed" } });
      }
    },
  };
});

/** HEIC can't be shown in <img> on most browsers — decode a real preview. */
async function hydratePreview(
  sf: StudioFile,
  patchFile: (id: string, patch: Partial<StudioFile>) => void,
) {
  try {
    const oldPreview = sf.previewUrl;
    const head = new Uint8Array(await sf.file.slice(0, 32).arrayBuffer());
    const format = sniffFormat(head);

    // Dimensions for the badge (cheap for natively-decodable formats).
    if (format !== "heic") {
      try {
        const bmp = await createImageBitmap(sf.file);
        patchFile(sf.id, { width: bmp.width, height: bmp.height });
        bmp.close();
        return;
      } catch {
        /* fall through to worker decode */
      }
    }

    const img = getImageWorker();
    const decoded = await img.decode(sf.file);
    patchFile(sf.id, { width: decoded.width, height: decoded.height });

    // Build a scaled-down PNG preview for formats <img> can't render.
    const scale = Math.min(1, 480 / Math.max(decoded.width, decoded.height));
    const canvas = new OffscreenCanvas(
      Math.max(1, Math.round(decoded.width * scale)),
      Math.max(1, Math.round(decoded.height * scale)),
    );
    const ctx = canvas.getContext("2d")!;
    const full = new ImageData(
      new Uint8ClampedArray(decoded.data),
      decoded.width,
      decoded.height,
    );
    const bmp = await createImageBitmap(full);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await canvas.convertToBlob({ type: "image/png" });
    patchFile(sf.id, { previewUrl: URL.createObjectURL(blob) });
    if (oldPreview) URL.revokeObjectURL(oldPreview);
  } catch {
    /* preview is best-effort */
  }
}
