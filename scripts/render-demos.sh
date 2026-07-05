#!/usr/bin/env bash
# Renders all landing-page demo clips into public/demos/.
set -euo pipefail
cd "$(dirname "$0")/.."

for id in hero-removebg demo-compress demo-convert demo-crop demo-exif demo-privacy; do
  npx remotion render remotion/index.ts "$id" "public/demos/$id.mp4" --codec=h264
done
