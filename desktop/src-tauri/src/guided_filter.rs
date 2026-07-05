//! Fast guided filter for alpha-matte refinement (He et al. 2015).
//!
//! Direct port of the web app's `src/lib/guided-filter.ts` so both builds
//! produce identical edges: coefficients at a subsampled resolution via
//! integral-image box filters, upsampled bilinearly, applied per-pixel.

const SUB_MAX: usize = 1100; // long side of the subsampled working resolution
const RADIUS: f32 = 8.0; // box radius at working resolution
const EPS: f32 = 1e-4;

pub fn refine_alpha(rgba: &[u8], alpha: &[u8], width: usize, height: usize) -> Vec<u8> {
    let n = width * height;

    // Full-res grayscale guide, normalized to 0..1
    let mut gray = vec![0.0f32; n];
    for i in 0..n {
        let p = i * 4;
        gray[i] = (0.299 * rgba[p] as f32 + 0.587 * rgba[p + 1] as f32 + 0.114 * rgba[p + 2] as f32)
            / 255.0;
    }

    let scale = (SUB_MAX as f32 / width.max(height) as f32).min(1.0);
    let sw = ((width as f32 * scale).round() as usize).max(1);
    let sh = ((height as f32 * scale).round() as usize).max(1);

    let guide_sub = downsample(&gray, width, height, sw, sh);
    let alpha_full: Vec<f32> = alpha.iter().map(|&a| a as f32 / 255.0).collect();
    let alpha_sub = downsample(&alpha_full, width, height, sw, sh);

    let r = ((RADIUS * (sw as f32 / width.max(1) as f32)).round() + RADIUS) as usize;
    let r = r.max(2);

    let mean_i = box_filter(&guide_sub, sw, sh, r);
    let mean_p = box_filter(&alpha_sub, sw, sh, r);
    let ii: Vec<f32> = guide_sub.iter().map(|v| v * v).collect();
    let ip: Vec<f32> = guide_sub.iter().zip(&alpha_sub).map(|(a, b)| a * b).collect();
    let corr_i = box_filter(&ii, sw, sh, r);
    let corr_ip = box_filter(&ip, sw, sh, r);

    let mut a = vec![0.0f32; sw * sh];
    let mut b = vec![0.0f32; sw * sh];
    for i in 0..a.len() {
        let var_i = corr_i[i] - mean_i[i] * mean_i[i];
        let cov_ip = corr_ip[i] - mean_i[i] * mean_p[i];
        a[i] = cov_ip / (var_i + EPS);
        b[i] = mean_p[i] - a[i] * mean_i[i];
    }

    let mean_a = box_filter(&a, sw, sh, r);
    let mean_b = box_filter(&b, sw, sh, r);

    let mut out = vec![0u8; n];
    let sx = sw as f32 / width as f32;
    let sy = sh as f32 / height as f32;
    for y in 0..height {
        let fy = ((y as f32 + 0.5) * sy - 0.5).clamp(0.0, sh as f32 - 1.001);
        let y0 = fy as usize;
        let wy = fy - y0 as f32;
        for x in 0..width {
            let fx = ((x as f32 + 0.5) * sx - 0.5).clamp(0.0, sw as f32 - 1.001);
            let x0 = fx as usize;
            let wx = fx - x0 as f32;
            let i00 = y0 * sw + x0;
            let i10 = i00 + 1;
            let i01 = i00 + sw;
            let i11 = i01 + 1;
            let av = mean_a[i00] * (1.0 - wx) * (1.0 - wy)
                + mean_a[i10] * wx * (1.0 - wy)
                + mean_a[i01] * (1.0 - wx) * wy
                + mean_a[i11] * wx * wy;
            let bv = mean_b[i00] * (1.0 - wx) * (1.0 - wy)
                + mean_b[i10] * wx * (1.0 - wy)
                + mean_b[i01] * (1.0 - wx) * wy
                + mean_b[i11] * wx * wy;
            let idx = y * width + x;
            let q = av * gray[idx] + bv;
            out[idx] = (q.clamp(0.0, 1.0) * 255.0).round() as u8;
        }
    }
    out
}

/// Area-average downsample of a single-channel float image.
fn downsample(src: &[f32], w: usize, h: usize, dw: usize, dh: usize) -> Vec<f32> {
    if dw == w && dh == h {
        return src.to_vec();
    }
    let mut out = vec![0.0f32; dw * dh];
    let xr = w as f32 / dw as f32;
    let yr = h as f32 / dh as f32;
    for y in 0..dh {
        let y0 = (y as f32 * yr).floor() as usize;
        let y1 = (((y + 1) as f32 * yr).floor() as usize).max(y0 + 1).min(h);
        for x in 0..dw {
            let x0 = (x as f32 * xr).floor() as usize;
            let x1 = (((x + 1) as f32 * xr).floor() as usize).max(x0 + 1).min(w);
            let mut sum = 0.0f32;
            for yy in y0..y1 {
                for xx in x0..x1 {
                    sum += src[yy * w + xx];
                }
            }
            out[y * dw + x] = sum / ((y1 - y0) * (x1 - x0)) as f32;
        }
    }
    out
}

/// O(1)-per-pixel box filter using an integral image, edge-normalized.
fn box_filter(src: &[f32], w: usize, h: usize, r: usize) -> Vec<f32> {
    let iw = w + 1;
    let mut integral = vec![0.0f64; iw * (h + 1)];
    for y in 0..h {
        let mut row_sum = 0.0f64;
        for x in 0..w {
            row_sum += src[y * w + x] as f64;
            integral[(y + 1) * iw + (x + 1)] = integral[y * iw + (x + 1)] + row_sum;
        }
    }
    let mut out = vec![0.0f32; w * h];
    for y in 0..h {
        let y0 = y.saturating_sub(r);
        let y1 = (y + r).min(h - 1) + 1;
        for x in 0..w {
            let x0 = x.saturating_sub(r);
            let x1 = (x + r).min(w - 1) + 1;
            let sum = integral[y1 * iw + x1] - integral[y0 * iw + x1] - integral[y1 * iw + x0]
                + integral[y0 * iw + x0];
            out[y * w + x] = (sum / ((y1 - y0) * (x1 - x0)) as f64) as f32;
        }
    }
    out
}
