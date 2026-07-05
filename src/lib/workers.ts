"use client";

import { proxy, wrap, type Remote } from "comlink";
import type { ImageWorkerApi } from "@/workers/image.worker";
import type { BgWorkerApi } from "@/workers/bg.worker";

let imageApi: Remote<ImageWorkerApi> | null = null;
let bgApi: Remote<BgWorkerApi> | null = null;

export function getImageWorker(): Remote<ImageWorkerApi> {
  if (!imageApi) {
    const worker = new Worker(
      new URL("../workers/image.worker.ts", import.meta.url),
      { type: "module" },
    );
    imageApi = wrap<ImageWorkerApi>(worker);
  }
  return imageApi;
}

export function getBgWorker(): Remote<BgWorkerApi> {
  if (!bgApi) {
    const worker = new Worker(
      new URL("../workers/bg.worker.ts", import.meta.url),
      { type: "module" },
    );
    bgApi = wrap<BgWorkerApi>(worker);
  }
  return bgApi;
}

export const workerProxy = proxy;
