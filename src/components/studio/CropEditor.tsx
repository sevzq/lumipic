"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { springSnappy } from "@/lib/motion";
import { useStudio } from "@/lib/store";
import type { CropParams, StudioFile } from "@/lib/types";
import { CheckIcon } from "@/components/icons";

type Rect = { x: number; y: number; w: number; h: number };
type DragMode =
  | "move"
  | "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w"
  | null;

const ASPECTS = [
  { id: "free", ratio: null },
  { id: "1:1", ratio: 1 },
  { id: "4:3", ratio: 4 / 3 },
  { id: "16:9", ratio: 16 / 9 },
  { id: "9:16", ratio: 9 / 16 },
] as const;

const MIN_SIZE = 16;
const ACCENT = "#FF3D8B";

export function CropEditor({ sf }: { sf: StudioFile }) {
  const t = useTranslations("crop");
  const applyCrop = useStudio((s) => s.applyCrop);

  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState({ w: sf.width, h: sf.height });
  const [rotate, setRotate] = useState<CropParams["rotate"]>(0);
  const [flipH, setFlipH] = useState(false);
  const [aspect, setAspect] = useState<(typeof ASPECTS)[number]["id"]>("free");
  const [rect, setRect] = useState<Rect | null>(null);

  const drag = useRef<{
    mode: DragMode;
    startX: number;
    startY: number;
    startRect: Rect;
  } | null>(null);

  // image dims in the rotated visual space
  const quarter = rotate === 90 || rotate === 270;
  const iw = quarter ? natural.h : natural.w;
  const ih = quarter ? natural.w : natural.h;

  // object-contain math
  const scale = iw > 0 && box.w > 0 ? Math.min(box.w / iw, box.h / ih) : 0;
  const dw = iw * scale;
  const dh = ih * scale;
  const ox = (box.w - dw) / 2;
  const oy = (box.h - dh) / 2;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setBox({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (sf.width > 0) setNatural({ w: sf.width, h: sf.height });
  }, [sf.width, sf.height]);

  const defaultRect = useCallback(
    (ratio: number | null): Rect => {
      let w = iw * 0.82;
      let h = ih * 0.82;
      if (ratio) {
        if (w / h > ratio) w = h * ratio;
        else h = w / ratio;
      }
      return { x: (iw - w) / 2, y: (ih - h) / 2, w, h };
    },
    [iw, ih],
  );

  // (re)initialize the rect when image dims / orientation / aspect change
  useEffect(() => {
    if (iw > 0) {
      const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;
      setRect(defaultRect(ratio));
    }
  }, [iw, ih, aspect, defaultRect]);

  const clampRect = useCallback(
    (r: Rect): Rect => {
      const w = Math.min(r.w, iw);
      const h = Math.min(r.h, ih);
      return {
        x: Math.max(0, Math.min(r.x, iw - w)),
        y: Math.max(0, Math.min(r.y, ih - h)),
        w,
        h,
      };
    },
    [iw, ih],
  );

  const onPointerDown = (mode: DragMode) => (e: React.PointerEvent) => {
    if (!rect) return;
    e.preventDefault();
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, startX: e.clientX, startY: e.clientY, startRect: rect };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !d.mode || scale === 0) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;
    const s = d.startRect;
    const ratio = ASPECTS.find((a) => a.id === aspect)?.ratio ?? null;

    if (d.mode === "move") {
      setRect(clampRect({ ...s, x: s.x + dx, y: s.y + dy }));
      return;
    }

    let { x, y, w, h } = s;
    const east = d.mode.includes("e");
    const west = d.mode.includes("w");
    const north = d.mode.includes("n");
    const south = d.mode.includes("s");

    if (east) w = s.w + dx;
    if (west) { x = s.x + dx; w = s.w - dx; }
    if (south) h = s.h + dy;
    if (north) { y = s.y + dy; h = s.h - dy; }

    w = Math.max(MIN_SIZE, w);
    h = Math.max(MIN_SIZE, h);

    if (ratio) {
      // Corner drags honor the dominant axis; edge drags derive the other.
      if (d.mode === "n" || d.mode === "s") w = h * ratio;
      else if (d.mode === "e" || d.mode === "w") h = w / ratio;
      else if (w / h > ratio) w = h * ratio;
      else h = w / ratio;
      if (west) x = s.x + s.w - w;
      if (north) y = s.y + s.h - h;
    }

    // keep inside bounds
    if (x < 0) { if (west) w += x; x = 0; }
    if (y < 0) { if (north) h += y; y = 0; }
    if (x + w > iw) w = iw - x;
    if (y + h > ih) h = ih - y;
    if (ratio) {
      // re-derive after boundary clamps so the ratio survives
      if (w / h > ratio) w = h * ratio;
      else h = w / ratio;
    }

    setRect({ x, y, w, h });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  if (!sf.previewUrl) return null;

  const rx = ox + (rect?.x ?? 0) * scale;
  const ry = oy + (rect?.y ?? 0) * scale;
  const rw = (rect?.w ?? 0) * scale;
  const rh = (rect?.h ?? 0) * scale;

  const handles: { mode: DragMode; style: React.CSSProperties; cursor: string }[] = [
    { mode: "nw", style: { left: 0, top: 0 }, cursor: "nwse-resize" },
    { mode: "n", style: { left: "50%", top: 0 }, cursor: "ns-resize" },
    { mode: "ne", style: { left: "100%", top: 0 }, cursor: "nesw-resize" },
    { mode: "e", style: { left: "100%", top: "50%" }, cursor: "ew-resize" },
    { mode: "se", style: { left: "100%", top: "100%" }, cursor: "nwse-resize" },
    { mode: "s", style: { left: "50%", top: "100%" }, cursor: "ns-resize" },
    { mode: "sw", style: { left: 0, top: "100%" }, cursor: "nesw-resize" },
    { mode: "w", style: { left: 0, top: "50%" }, cursor: "ew-resize" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline bg-white px-4 py-3">
        <div className="flex rounded-full border border-hairline bg-surface-soft p-1">
          {ASPECTS.map((a) => {
            const active = aspect === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAspect(a.id)}
                className={`relative rounded-full px-3 py-1 text-[12px] font-semibold transition-colors ${
                  active ? "text-white" : "text-black/60 hover:text-black"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="aspect-pill"
                    transition={springSnappy}
                    className="absolute inset-0 rounded-full bg-black"
                  />
                )}
                <span className="relative">
                  {a.id === "free" ? t("free") : a.id}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setRotate(((rotate + 90) % 360) as CropParams["rotate"])}
            className="flex h-8 items-center gap-1.5 rounded-full border border-hairline bg-white px-3 text-[12px] font-medium text-black/70 transition-colors hover:border-black/40 hover:text-black"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 8.5a9 9 0 1 0 .5 4.5" />
              <path d="M21 3v5.5h-5.5" />
            </svg>
            {t("rotate")}
          </button>
          <button
            onClick={() => setFlipH(!flipH)}
            className={`flex h-8 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors ${
              flipH
                ? "border-black bg-black text-white"
                : "border-hairline bg-white text-black/70 hover:border-black/40 hover:text-black"
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v18M8 7 4 12l4 5M16 7l4 5-4 5" />
            </svg>
            {t("flip")}
          </button>

          {rect && (
            <span className="eyebrow hidden text-black/45 sm:inline">
              {Math.round(rect.w)} × {Math.round(rect.h)}
            </span>
          )}

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={springSnappy}
            onClick={() => {
              if (!rect) return;
              applyCrop(sf.id, {
                x: rect.x,
                y: rect.y,
                w: rect.w,
                h: rect.h,
                rotate,
                flipH,
              });
            }}
            className="flex h-8 items-center gap-1.5 rounded-full bg-black px-4 text-[12.5px] font-semibold text-white"
          >
            <CheckIcon size={14} />
            {t("apply")}
          </motion.button>
        </div>
      </div>

      {/* canvas */}
      <div
        ref={containerRef}
        className="checkerboard relative min-h-0 flex-1 touch-none select-none overflow-hidden"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {scale > 0 && (
          <>
            <img
              src={sf.previewUrl}
              alt={sf.name}
              draggable={false}
              className="pointer-events-none absolute left-1/2 top-1/2"
              style={{
                width: natural.w * scale,
                height: natural.h * scale,
                maxWidth: "none",
                transform: `translate(-50%, -50%) ${flipH ? "scaleX(-1)" : ""} rotate(${rotate}deg)`,
              }}
            />

            {rect && (
              <>
                {/* dim mask with a hole */}
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: rx,
                    top: ry,
                    width: rw,
                    height: rh,
                    boxShadow: "0 0 0 9999px rgba(255,255,255,0.65)",
                  }}
                />
                {/* crop rect */}
                <div
                  className="absolute cursor-move"
                  style={{
                    left: rx,
                    top: ry,
                    width: rw,
                    height: rh,
                    border: `2px solid ${ACCENT}`,
                    boxShadow: `0 4px 24px -6px ${ACCENT}55`,
                  }}
                  onPointerDown={onPointerDown("move")}
                >
                  {/* rule of thirds */}
                  <div className="pointer-events-none absolute inset-0 opacity-50">
                    <div className="absolute left-1/3 top-0 h-full w-px bg-black/30" />
                    <div className="absolute left-2/3 top-0 h-full w-px bg-black/30" />
                    <div className="absolute left-0 top-1/3 h-px w-full bg-black/30" />
                    <div className="absolute left-0 top-2/3 h-px w-full bg-black/30" />
                  </div>

                  {handles.map((h) => (
                    <div
                      key={h.mode}
                      onPointerDown={onPointerDown(h.mode)}
                      className="absolute z-10 h-5 w-5 -translate-x-1/2 -translate-y-1/2"
                      style={{ ...h.style, cursor: h.cursor }}
                    >
                      <span
                        className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                        style={{
                          border: `2px solid ${ACCENT}`,
                          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
