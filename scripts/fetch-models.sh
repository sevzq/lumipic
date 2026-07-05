#!/usr/bin/env bash
# Downloads the self-hosted AI models into public/models/.
# Run once locally (pnpm fetch:models) and during Docker build.
#
# Two variants of BiRefNet_lite (MIT) are shipped; the worker picks one at
# runtime based on the WebGPU adapter's maxStorageBuffersPerShaderStage:
#   - 1024px graph: best quality, needs limit >= 11 (Chrome 146+)
#   - 512px graph:  max 7 buffers, runs on every WebGPU adapter
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

fetch_repo "onnx-community/BiRefNet_lite" "BiRefNet_lite"
fetch_repo "studioludens/birefnet-lite-512" "BiRefNet_lite_512"

echo "Models ready in $ROOT"
