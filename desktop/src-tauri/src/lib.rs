pub mod engine;
pub mod guided_filter;

use engine::{Engine, Progress};
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;
use tauri::ipc::Response;
use tauri::{AppHandle, Emitter, Manager, State};

struct AppState {
    engine: Mutex<Option<Engine>>,
    /// Last cutout per source path, kept for export without re-sending bytes.
    results: Mutex<HashMap<String, Vec<u8>>>,
}

#[derive(Serialize, Clone)]
struct ProgressEvent {
    path: String,
    stage: String,
    value: f32,
}

#[derive(Serialize)]
struct InitInfo {
    load_ms: u128,
    model: String,
}

fn model_path(app: &AppHandle) -> Result<PathBuf, String> {
    // Bundled resource in production; src-tauri/models/ in dev.
    let resource = app
        .path()
        .resolve("models/model_fp16.onnx", tauri::path::BaseDirectory::Resource);
    match resource {
        Ok(p) if p.exists() => Ok(p),
        _ => {
            let dev = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("models/model_fp16.onnx");
            if dev.exists() {
                Ok(dev)
            } else {
                Err("model file not found (models/model_fp16.onnx)".into())
            }
        }
    }
}

#[tauri::command]
fn init_engine(app: AppHandle, state: State<AppState>) -> Result<InitInfo, String> {
    let mut guard = state.engine.lock().unwrap();
    if guard.is_none() {
        let t0 = Instant::now();
        let path = model_path(&app)?;
        let engine = Engine::load(&path).map_err(|e| format!("engine load: {e}"))?;
        *guard = Some(engine);
        Ok(InitInfo {
            load_ms: t0.elapsed().as_millis(),
            model: "BiRefNet_lite 1024 (native CoreML/CPU)".into(),
        })
    } else {
        Ok(InitInfo {
            load_ms: 0,
            model: "BiRefNet_lite 1024 (native CoreML/CPU)".into(),
        })
    }
}

/// Process one image; returns the cutout PNG bytes directly (zero-copy IPC).
#[tauri::command]
fn remove_bg(app: AppHandle, state: State<AppState>, path: String) -> Result<Response, String> {
    let mut guard = state.engine.lock().unwrap();
    let engine = guard.as_mut().ok_or("engine not initialized")?;

    let emit_path = path.clone();
    let emitter = app.clone();
    let progress = Progress {
        emit: &move |stage: &str, value: f32| {
            let _ = emitter.emit(
                "bg-progress",
                ProgressEvent {
                    path: emit_path.clone(),
                    stage: stage.into(),
                    value,
                },
            );
        },
    };

    let (png, _w, _h) = engine.remove_background(std::path::Path::new(&path), &progress)?;
    state
        .results
        .lock()
        .unwrap()
        .insert(path.clone(), png.clone());
    Ok(Response::new(png))
}

/// Write the stored cutout for `src_path` to `dest_path`.
#[tauri::command]
fn export_cutout(state: State<AppState>, src_path: String, dest_path: String) -> Result<(), String> {
    let results = state.results.lock().unwrap();
    let png = results.get(&src_path).ok_or("no result for this image")?;
    std::fs::write(&dest_path, png).map_err(|e| format!("write: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            engine: Mutex::new(None),
            results: Mutex::new(HashMap::new()),
        })
        .invoke_handler(tauri::generate_handler![
            init_engine,
            remove_bg,
            export_cutout
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
