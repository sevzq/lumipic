// Copies onnxruntime-web WASM runtime files into public/ort/ so the app
// never depends on a third-party CDN (required for reliability in all regions).
// Resolution is done through Node's module system so it works with npm and
// pnpm (strict, symlinked node_modules) alike.
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

function findPackageRoot(startFile) {
  let dir = dirname(startFile);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "dist"))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return null;
}

let ortDist = null;
try {
  const require = createRequire(import.meta.url);
  // Resolve the exact onnxruntime-web instance that transformers.js depends on.
  const transformersEntry = require.resolve("@huggingface/transformers");
  const ortRequire = createRequire(transformersEntry);
  const ortEntry = ortRequire.resolve("onnxruntime-web");
  const root = findPackageRoot(ortEntry);
  if (root) ortDist = join(root, "dist");
} catch {
  /* fall through to direct lookup */
}

if (!ortDist || !existsSync(ortDist)) {
  const fallback = join(process.cwd(), "node_modules/onnxruntime-web/dist");
  if (existsSync(fallback)) ortDist = fallback;
}

if (!ortDist) {
  console.error("copy-ort: onnxruntime-web dist not found");
  process.exit(1);
}

const dest = join(process.cwd(), "public", "ort");
mkdirSync(dest, { recursive: true });

const files = readdirSync(ortDist).filter(
  (f) => f.startsWith("ort-wasm") && (f.endsWith(".wasm") || f.endsWith(".mjs")),
);
for (const f of files) {
  cpSync(join(ortDist, f), join(dest, f));
}
console.log(`copy-ort: copied ${files.length} files from ${ortDist}`);
