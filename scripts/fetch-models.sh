#!/usr/bin/env bash
# Downloads the self-hosted AI model into public/models/.
# Run once locally (pnpm fetch:models) and during Docker build.
#
# BiRefNet_lite 512px re-export (MIT, max 7 storage buffers): the only
# variant that runs on every WebGPU adapter. The 1024px graph is blocked in
# browsers on all platforms by a WASM memory wall (ScatterND/GatherND CPU
# fallback OOMs the 32-bit heap) — see scripts/patch-onnx-webgpu.py and the
# README's "Why 512" section for the full investigation.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)/public/models"

fetch() {
  local url="$1" out="$2"
  echo "-> $out"
  curl -fL --retry 3 --retry-delay 2 -C - -o "$out" "$url"
}

fetch_repo() {
  local repo="$1" dest="$ROOT/$2"
  local base="https://huggingface.co/$repo/resolve/main"
  mkdir -p "$dest/onnx"
  fetch "$base/config.json" "$dest/config.json"
  fetch "$base/preprocessor_config.json" "$dest/preprocessor_config.json"
  fetch "$base/onnx/model_fp16.onnx" "$dest/onnx/model_fp16.onnx"
}

fetch_repo "studioludens/birefnet-lite-512" "BiRefNet_lite_512"

echo "Models ready in $ROOT"
