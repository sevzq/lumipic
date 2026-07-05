"use client";

import { zip } from "fflate";
import type { StudioFile } from "@/lib/types";

export function outputName(sf: StudioFile): string {
  const base = sf.name.replace(/\.[^.]+$/, "");
  const ext = sf.result?.ext ?? "png";
  return `${base}-lumipic.${ext}`;
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadAllAsZip(files: StudioFile[]) {
  const done = files.filter((f) => f.status === "done" && f.result);
  if (done.length === 0) return;
  if (done.length === 1) {
    downloadBlob(done[0].result!.blob, outputName(done[0]));
    return;
  }

  const entries: Record<string, Uint8Array> = {};
  const used = new Set<string>();
  for (const f of done) {
    let name = outputName(f);
    let i = 2;
    while (used.has(name)) {
      name = name.replace(/(\.[^.]+)$/, `-${i++}$1`);
    }
    used.add(name);
    entries[name] = new Uint8Array(await f.result!.blob.arrayBuffer());
  }

  const zipped = await new Promise<Uint8Array>((resolve, reject) => {
    zip(entries, { level: 0 }, (err, data) =>
      err ? reject(err) : resolve(data),
    );
  });
  downloadBlob(
    new Blob([zipped as unknown as BlobPart], { type: "application/zip" }),
    "lumipic.zip",
  );
}
