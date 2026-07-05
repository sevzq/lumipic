/**
 * Fast guided filter for alpha-matte refinement (He et al. 2015).
 *
 * The segmentation model outputs a mask at ~1024px which gets bilinearly
 * upscaled to the original resolution — edges end up slightly soft/misaligned.
 * Using the original image as the guide, this snaps the alpha matte back onto
 * real edges (hair, fur, thin structures) at full resolution.
 *
 * Coefficients are computed at a subsampled resolution (linear-time box
 * filtering via integral images), then upsampled and applied per-pixel.
 */

const SUB_MAX = 1100; // long side of the subsampled working resolution
const RADIUS = 8; // box radius at working resolution
const EPS = 1e-4;

export function refineAlpha(
  rgba: Uint8ClampedArray,
  alpha: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Uint8ClampedArray {
  // Full-res grayscale guide, normalized to 0..1
  const gray = new Float32Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] =
      (0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]) / 255;
  }

  const scale = Math.min(1, SUB_MAX / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * scale));
  const sh = Math.max(1, Math.round(height * scale));

  const guideSub = downsample(gray, width, height, sw, sh);
  const alphaFull = new Float32Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) alphaFull[i] = alpha[i] / 255;
  const alphaSub = downsample(alphaFull, width, height, sw, sh);

  const r = Math.max(2, Math.round(RADIUS * (sw / Math.max(width, 1))) + RADIUS);

  const meanI = boxFilter(guideSub, sw, sh, r);
  const meanP = boxFilter(alphaSub, sw, sh, r);
  const II = mul(guideSub, guideSub);
  const IP = mul(guideSub, alphaSub);
  const corrI = boxFilter(II, sw, sh, r);
  const corrIP = boxFilter(IP, sw, sh, r);

  const a = new Float32Array(sw * sh);
  const b = new Float32Array(sw * sh);
  for (let i = 0; i < a.length; i++) {
    const varI = corrI[i] - meanI[i] * meanI[i];
    const covIP = corrIP[i] - meanI[i] * meanP[i];
    a[i] = covIP / (varI + EPS);
    b[i] = meanP[i] - a[i] * meanI[i];
  }

  const meanA = boxFilter(a, sw, sh, r);
  const meanB = boxFilter(b, sw, sh, r);

  const out = new Uint8ClampedArray(width * height);
  const sx = sw / width;
  const sy = sh / height;
  for (let y = 0; y < height; y++) {
    const fy = Math.min(sh - 1.001, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = fy | 0;
    const wy = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(sw - 1.001, Math.max(0, (x + 0.5) * sx - 0.5));
      const x0 = fx | 0;
      const wx = fx - x0;
      const i00 = y0 * sw + x0;
      const i10 = i00 + 1;
      const i01 = i00 + sw;
      const i11 = i01 + 1;
      const av =
        meanA[i00] * (1 - wx) * (1 - wy) +
        meanA[i10] * wx * (1 - wy) +
        meanA[i01] * (1 - wx) * wy +
        meanA[i11] * wx * wy;
      const bv =
        meanB[i00] * (1 - wx) * (1 - wy) +
        meanB[i10] * wx * (1 - wy) +
        meanB[i01] * (1 - wx) * wy +
        meanB[i11] * wx * wy;
      const idx = y * width + x;
      const q = av * gray[idx] + bv;
      out[idx] = Math.round(Math.min(1, Math.max(0, q)) * 255);
    }
  }
  return out;
}

function mul(a: Float32Array, b: Float32Array): Float32Array {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i];
  return out;
}

/** Area-average downsample of a single-channel float image. */
function downsample(
  src: Float32Array,
  w: number,
  h: number,
  dw: number,
  dh: number,
): Float32Array {
  if (dw === w && dh === h) return src.slice();
  const out = new Float32Array(dw * dh);
  const xr = w / dw;
  const yr = h / dh;
  for (let y = 0; y < dh; y++) {
    const y0 = Math.floor(y * yr);
    const y1 = Math.min(h, Math.max(y0 + 1, Math.floor((y + 1) * yr)));
    for (let x = 0; x < dw; x++) {
      const x0 = Math.floor(x * xr);
      const x1 = Math.min(w, Math.max(x0 + 1, Math.floor((x + 1) * xr)));
      let sum = 0;
      for (let yy = y0; yy < y1; yy++) {
        for (let xx = x0; xx < x1; xx++) sum += src[yy * w + xx];
      }
      out[y * dw + x] = sum / ((y1 - y0) * (x1 - x0));
    }
  }
  return out;
}

/** O(1)-per-pixel box filter using an integral image, edge-normalized. */
function boxFilter(
  src: Float32Array,
  w: number,
  h: number,
  r: number,
): Float32Array {
  const iw = w + 1;
  const integral = new Float64Array(iw * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += src[y * w + x];
      integral[(y + 1) * iw + (x + 1)] = integral[y * iw + (x + 1)] + rowSum;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h - 1, y + r) + 1;
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r) + 1;
      const sum =
        integral[y1 * iw + x1] -
        integral[y0 * iw + x1] -
        integral[y1 * iw + x0] +
        integral[y0 * iw + x0];
      out[y * w + x] = sum / ((y1 - y0) * (x1 - x0));
    }
  }
  return out;
}
