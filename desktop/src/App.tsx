import { useCallback, useEffect, useRef, useState } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { open, save } from "@tauri-apps/plugin-dialog";
import "./App.css";

type Lang = "zh" | "en";

const STRINGS = {
  zh: {
    tagline: "本地 AI 抠图 · 1024 高清",
    engineLoading: "正在加载 1024 模型…",
    engineReady: "引擎就绪",
    drop: "把图片拖到这里",
    or: "或",
    browse: "选择文件",
    hint: "JPG · PNG · WEBP · BMP — 图片永远不会离开你的电脑",
    queued: "排队中",
    running: "处理中",
    done: "完成",
    error: "失败",
    save: "保存 PNG",
    saveAll: "保存全部",
    clear: "清空",
    holdToCompare: "按住看原图",
    stage: {
      decode: "解码",
      preprocess: "预处理",
      inference: "AI 推理",
      matte: "蒙版",
      refine: "边缘精修",
      encode: "编码",
      done: "完成",
    } as Record<string, string>,
    footer: "端侧推理 · BiRefNet 1024 · CoreML 加速 · 零上传",
  },
  en: {
    tagline: "On-device AI cutouts · 1024 HD",
    engineLoading: "Loading the 1024 model…",
    engineReady: "Engine ready",
    drop: "Drop images here",
    or: "or",
    browse: "browse files",
    hint: "JPG · PNG · WEBP · BMP — your photos never leave this Mac",
    queued: "Queued",
    running: "Processing",
    done: "Done",
    error: "Failed",
    save: "Save PNG",
    saveAll: "Save all",
    clear: "Clear",
    holdToCompare: "Hold to compare",
    stage: {
      decode: "Decode",
      preprocess: "Preprocess",
      inference: "AI inference",
      matte: "Matte",
      refine: "Edge refine",
      encode: "Encode",
      done: "Done",
    } as Record<string, string>,
    footer: "On-device · BiRefNet 1024 · CoreML accelerated · zero uploads",
  },
} satisfies Record<Lang, unknown>;

const EXT = /\.(jpe?g|png|webp|bmp|gif|tiff?)$/i;

interface Item {
  path: string;
  name: string;
  origUrl: string;
  cutUrl?: string;
  status: "queued" | "running" | "done" | "error";
  stage: string;
  progress: number;
  ms?: number;
  error?: string;
}

export default function App() {
  const [lang, setLang] = useState<Lang>("zh");
  const t = STRINGS[lang];
  const [engine, setEngine] = useState<"loading" | "ready" | "error">("loading");
  const [engineMs, setEngineMs] = useState<number | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [compare, setCompare] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    invoke<{ load_ms: number }>("init_engine")
      .then((info) => {
        setEngineMs(info.load_ms);
        setEngine("ready");
      })
      .catch(() => setEngine("error"));
  }, []);

  useEffect(() => {
    const un = listen<{ path: string; stage: string; value: number }>(
      "bg-progress",
      (e) => {
        setItems((prev) =>
          prev.map((it) =>
            it.path === e.payload.path
              ? { ...it, stage: e.payload.stage, progress: e.payload.value }
              : it,
          ),
        );
      },
    );
    return () => {
      un.then((f) => f());
    };
  }, []);

  const addPaths = useCallback((paths: string[]) => {
    const fresh = paths
      .filter((p) => EXT.test(p))
      .map<Item>((p) => ({
        path: p,
        name: p.split("/").pop() ?? p,
        origUrl: convertFileSrc(p),
        status: "queued",
        stage: "",
        progress: 0,
      }));
    if (fresh.length) {
      setItems((prev) => [
        ...prev,
        ...fresh.filter((f) => !prev.some((p) => p.path === f.path)),
      ]);
    }
  }, []);

  useEffect(() => {
    const un = getCurrentWebview().onDragDropEvent((e) => {
      if (e.payload.type === "over") setDragOver(true);
      else if (e.payload.type === "drop") {
        setDragOver(false);
        addPaths(e.payload.paths);
      } else setDragOver(false);
    });
    return () => {
      un.then((f) => f());
    };
  }, [addPaths]);

  // sequential queue
  useEffect(() => {
    if (busy.current || engine !== "ready") return;
    const next = items.find((it) => it.status === "queued");
    if (!next) return;
    busy.current = true;
    setItems((prev) =>
      prev.map((it) =>
        it.path === next.path ? { ...it, status: "running" } : it,
      ),
    );
    const t0 = performance.now();
    invoke<ArrayBuffer>("remove_bg", { path: next.path })
      .then((buf) => {
        const url = URL.createObjectURL(new Blob([buf], { type: "image/png" }));
        setItems((prev) =>
          prev.map((it) =>
            it.path === next.path
              ? {
                  ...it,
                  status: "done",
                  cutUrl: url,
                  progress: 1,
                  ms: Math.round(performance.now() - t0),
                }
              : it,
          ),
        );
      })
      .catch((err) => {
        setItems((prev) =>
          prev.map((it) =>
            it.path === next.path
              ? { ...it, status: "error", error: String(err) }
              : it,
          ),
        );
      })
      .finally(() => {
        busy.current = false;
        // trigger the effect again for the next queued item
        setItems((prev) => [...prev]);
      });
  }, [items, engine]);

  const pick = async () => {
    const sel = await open({
      multiple: true,
      filters: [
        { name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "bmp", "gif", "tiff"] },
      ],
    });
    if (sel) addPaths(Array.isArray(sel) ? sel : [sel]);
  };

  const exportOne = async (it: Item) => {
    const base = it.name.replace(/\.[^.]+$/, "");
    const dest = await save({
      defaultPath: `${base}-cutout.png`,
      filters: [{ name: "PNG", extensions: ["png"] }],
    });
    if (dest) await invoke("export_cutout", { srcPath: it.path, destPath: dest });
  };

  const exportAll = async () => {
    for (const it of items) {
      if (it.status === "done") await exportOne(it);
    }
  };

  const doneCount = items.filter((i) => i.status === "done").length;

  return (
    <div className="app">
      <header className="titlebar" data-tauri-drag-region>
        <div className="brand" data-tauri-drag-region>
          <span className="mark">L</span>
          <span className="name">LumiPic</span>
          <span className="tagline">{t.tagline}</span>
        </div>
        <div className="header-right">
          <span className={`engine engine-${engine}`}>
            <span className="dot" />
            {engine === "loading"
              ? t.engineLoading
              : engine === "ready"
                ? `${t.engineReady}${engineMs ? ` · ${(engineMs / 1000).toFixed(1)}s` : ""}`
                : "Engine error"}
          </span>
          <button
            className="lang"
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          >
            {lang === "zh" ? "EN" : "中"}
          </button>
        </div>
      </header>

      <main className="main">
        {items.length === 0 ? (
          <div
            className={`dropzone ${dragOver ? "over" : ""}`}
            onClick={pick}
            role="button"
          >
            <div className="plus">+</div>
            <div className="drop-title">{t.drop}</div>
            <div className="drop-sub">
              {t.or} <span className="browse">{t.browse}</span>
            </div>
            <div className="drop-hint">{t.hint}</div>
          </div>
        ) : (
          <>
            <div className="toolbar">
              <button className="btn ghost" onClick={pick}>
                + {t.browse}
              </button>
              <div className="spacer" />
              {doneCount > 1 && (
                <button className="btn" onClick={exportAll}>
                  {t.saveAll} ({doneCount})
                </button>
              )}
              <button
                className="btn ghost"
                onClick={() => {
                  items.forEach((i) => i.cutUrl && URL.revokeObjectURL(i.cutUrl));
                  setItems([]);
                }}
              >
                {t.clear}
              </button>
            </div>
            <div className={`grid ${dragOver ? "grid-over" : ""}`}>
              {items.map((it) => (
                <div className="card" key={it.path}>
                  <div
                    className={`preview ${it.status === "done" ? "checker" : ""}`}
                    onPointerDown={() => setCompare(it.path)}
                    onPointerUp={() => setCompare(null)}
                    onPointerLeave={() => setCompare(null)}
                  >
                    <img
                      src={
                        it.status === "done" && compare !== it.path
                          ? it.cutUrl
                          : it.origUrl
                      }
                      alt={it.name}
                      draggable={false}
                    />
                    {it.status === "running" && (
                      <div className="overlay">
                        <div className="bar">
                          <div
                            className="fill"
                            style={{ width: `${Math.round(it.progress * 100)}%` }}
                          />
                        </div>
                        <span className="stage">
                          {t.stage[it.stage] ?? t.running}
                        </span>
                      </div>
                    )}
                    {it.status === "error" && (
                      <div className="overlay err">{t.error}</div>
                    )}
                  </div>
                  <div className="meta">
                    <span className="fname" title={it.name}>
                      {it.name}
                    </span>
                    {it.status === "done" ? (
                      <div className="row">
                        <span className="ms">{((it.ms ?? 0) / 1000).toFixed(1)}s</span>
                        <span className="compare-hint">{t.holdToCompare}</span>
                        <button className="btn small" onClick={() => exportOne(it)}>
                          {t.save}
                        </button>
                      </div>
                    ) : (
                      <span className="status">
                        {it.status === "queued" ? t.queued : it.status === "running" ? t.running : t.error}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="footer">{t.footer}</footer>
    </div>
  );
}
