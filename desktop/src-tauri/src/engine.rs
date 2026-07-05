//! Native background-removal engine.
//!
//! Same pipeline as the web app's bg.worker, but running the full 1024px
//! BiRefNet_lite graph natively (no WASM heap cap, CoreML-accelerated):
//!   resize 1024² + ImageNet-normalize -> ONNX inference -> sigmoid (if the
//!   graph outputs logits) -> bilinear upscale of the matte to the original
//!   resolution -> guided-filter edge refinement -> RGBA PNG.

use image::imageops::FilterType;
use image::{DynamicImage, RgbaImage};
use ndarray::Array4;
use ort::execution_providers::CoreMLExecutionProvider;
use ort::session::Session;
use ort::value::TensorRef;
use std::io::Cursor;
use std::path::Path;

const MODEL_SIZE: u32 = 1024;
const MEAN: [f32; 3] = [0.485, 0.456, 0.406];
const STD: [f32; 3] = [0.229, 0.224, 0.225];

pub struct Engine {
    session: Session,
}

pub struct Progress<'a> {
    pub emit: &'a dyn Fn(&str, f32),
}

impl Engine {
    pub fn load(model_path: &Path) -> ort::Result<Self> {
        let session = Session::builder()?
            .with_execution_providers([CoreMLExecutionProvider::default().build()])?
            .commit_from_file(model_path)?;
        Ok(Self { session })
    }

    /// Full pipeline: image file -> cutout PNG bytes (+ dimensions).
    pub fn remove_background(
        &mut self,
        image_path: &Path,
        progress: &Progress,
    ) -> Result<(Vec<u8>, u32, u32), String> {
        (progress.emit)("decode", 0.05);
        let img = image::open(image_path).map_err(|e| format!("decode: {e}"))?;
        let rgba = img.to_rgba8();
        let (w, h) = (rgba.width(), rgba.height());

        (progress.emit)("preprocess", 0.15);
        let input = preprocess(&img);

        (progress.emit)("inference", 0.25);
        let outputs = self
            .session
            .run(ort::inputs![
                "input_image" => TensorRef::from_array_view(input.view())
                    .map_err(|e| format!("tensor: {e}"))?
            ])
            .map_err(|e| format!("inference: {e}"))?;
        let matte = outputs["output_image"]
            .try_extract_array::<f32>()
            .map_err(|e| format!("extract: {e}"))?;
        let matte = matte.as_slice().ok_or("matte not contiguous")?;

        (progress.emit)("matte", 0.7);
        let mut matte1024: Vec<f32> = matte.to_vec();
        // The exported graph may output logits; match transformers.js: apply
        // sigmoid only when values fall outside [0-eps, 1+eps].
        const EPS: f32 = 1e-5;
        if matte1024.iter().any(|&v| v < -EPS || v > 1.0 + EPS) {
            for v in matte1024.iter_mut() {
                *v = 1.0 / (1.0 + (-*v).exp());
            }
        }

        // Bilinear upscale of the matte back to the original resolution.
        let alpha = resize_bilinear(&matte1024, MODEL_SIZE as usize, MODEL_SIZE as usize, w as usize, h as usize);

        (progress.emit)("refine", 0.8);
        let alpha_u8: Vec<u8> = alpha
            .iter()
            .map(|&v| (v.clamp(0.0, 1.0) * 255.0).round() as u8)
            .collect();
        let refined = crate::guided_filter::refine_alpha(rgba.as_raw(), &alpha_u8, w as usize, h as usize);

        (progress.emit)("encode", 0.9);
        let mut out = RgbaImage::new(w, h);
        for (i, px) in out.pixels_mut().enumerate() {
            let p = i * 4;
            px.0 = [
                rgba.as_raw()[p],
                rgba.as_raw()[p + 1],
                rgba.as_raw()[p + 2],
                refined[i],
            ];
        }
        let mut png = Vec::new();
        out.write_to(&mut Cursor::new(&mut png), image::ImageFormat::Png)
            .map_err(|e| format!("encode: {e}"))?;
        (progress.emit)("done", 1.0);
        Ok((png, w, h))
    }
}

/// Resize to 1024², normalize with ImageNet stats, NCHW f32.
fn preprocess(img: &DynamicImage) -> Array4<f32> {
    let resized = img
        .resize_exact(MODEL_SIZE, MODEL_SIZE, FilterType::Triangle)
        .to_rgb8();
    let n = (MODEL_SIZE * MODEL_SIZE) as usize;
    let mut input = Array4::<f32>::zeros((1, 3, MODEL_SIZE as usize, MODEL_SIZE as usize));
    {
        let slice = input.as_slice_mut().unwrap();
        let raw = resized.as_raw();
        for i in 0..n {
            for c in 0..3 {
                slice[c * n + i] = (raw[i * 3 + c] as f32 / 255.0 - MEAN[c]) / STD[c];
            }
        }
    }
    input
}

/// Bilinear resample of a single-channel f32 image.
fn resize_bilinear(src: &[f32], sw: usize, sh: usize, dw: usize, dh: usize) -> Vec<f32> {
    if sw == dw && sh == dh {
        return src.to_vec();
    }
    let mut out = vec![0.0f32; dw * dh];
    let sx = sw as f32 / dw as f32;
    let sy = sh as f32 / dh as f32;
    for y in 0..dh {
        let fy = ((y as f32 + 0.5) * sy - 0.5).clamp(0.0, (sh - 1) as f32 - 0.001);
        let y0 = fy as usize;
        let wy = fy - y0 as f32;
        for x in 0..dw {
            let fx = ((x as f32 + 0.5) * sx - 0.5).clamp(0.0, (sw - 1) as f32 - 0.001);
            let x0 = fx as usize;
            let wx = fx - x0 as f32;
            let i00 = y0 * sw + x0;
            let v = src[i00] * (1.0 - wx) * (1.0 - wy)
                + src[i00 + 1] * wx * (1.0 - wy)
                + src[i00 + sw] * (1.0 - wx) * wy
                + src[i00 + sw + 1] * wx * wy;
            out[y * dw + x] = v;
        }
    }
    out
}
