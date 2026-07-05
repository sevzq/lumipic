//! End-to-end engine test: full 1024 pipeline on a real photo.
//! Run with: cargo test --release -- --nocapture

use desktop_lib::engine::{Engine, Progress};
use std::path::Path;
use std::time::Instant;

#[test]
fn full_pipeline_on_real_photo() {
    let model = Path::new(env!("CARGO_MANIFEST_DIR")).join("models/model_fp16.onnx");
    let photo = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../remotion/public/corgi.png");
    assert!(model.exists(), "model missing: {}", model.display());
    assert!(photo.exists(), "photo missing: {}", photo.display());

    let t0 = Instant::now();
    let mut engine = Engine::load(&model).expect("engine load");
    let load_ms = t0.elapsed().as_millis();

    let progress = Progress { emit: &|_, _| {} };

    // First run includes CoreML graph compilation; second shows steady state.
    let t1 = Instant::now();
    let (png, w, h) = engine
        .remove_background(&photo, &progress)
        .expect("first run");
    let first_ms = t1.elapsed().as_millis();

    let t2 = Instant::now();
    let (_png2, _, _) = engine
        .remove_background(&photo, &progress)
        .expect("second run");
    let second_ms = t2.elapsed().as_millis();

    println!("load={load_ms}ms first={first_ms}ms second={second_ms}ms out={w}x{h} png={}KB", png.len() / 1024);

    // sanity: output must contain both opaque and transparent pixels
    let img = image::load_from_memory(&png).expect("decode output").to_rgba8();
    let n = (img.width() * img.height()) as usize;
    let opaque = img.pixels().filter(|p| p.0[3] > 200).count();
    let transparent = img.pixels().filter(|p| p.0[3] < 50).count();
    println!("opaque={:.1}% transparent={:.1}%", 100.0 * opaque as f64 / n as f64, 100.0 * transparent as f64 / n as f64);
    assert!(opaque > n / 20, "almost nothing kept — matte broken?");
    assert!(transparent > n / 20, "almost nothing removed — matte broken?");

    std::fs::write("/tmp/hd-test/native-cutout.png", &png).unwrap();
}
