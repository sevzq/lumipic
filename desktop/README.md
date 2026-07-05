# LumiPic Desktop (MVP)

Native macOS build of LumiPic's background remover. Runs the **full 1024px
BiRefNet_lite graph** via onnxruntime (CoreML EP with CPU fallback) — no
browser WASM heap cap, so the HD model that can't run in any macOS browser
works here at ~3 s per image on an M-series chip.

Same pipeline as the web app: 1024 inference → matte upscale → guided-filter
edge refinement at the original resolution (Rust port of
`src/lib/guided-filter.ts`).

## Dev setup

```bash
# 1. model weights are not in git — stage them once (from the repo root):
pnpm fetch:models   # if you haven't already (downloads into public/models)
mkdir -p desktop/src-tauri/models
cp public/models/BiRefNet_lite/onnx/model_fp16.onnx desktop/src-tauri/models/

# 2. run
cd desktop
pnpm install
pnpm tauri dev
```

## Build

```bash
pnpm tauri build --bundles app
# → src-tauri/target/release/bundle/macos/LumiPic.app (~146 MB, model bundled)
```

## Engine test

End-to-end pipeline test on a real photo (loads the model, checks the matte,
writes /tmp/hd-test/native-cutout.png):

```bash
cd src-tauri
cargo test --release --test engine_test -- --nocapture
```
