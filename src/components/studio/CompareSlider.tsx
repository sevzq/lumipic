"use client";

import { useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useTranslations } from "next-intl";
import { springSnappy } from "@/lib/motion";

/**
 * Before/after viewer with a draggable divider — runs on motion values,
 * so dragging never re-renders React.
 */
export function CompareSlider({
  beforeUrl,
  afterUrl,
}: {
  beforeUrl: string;
  afterUrl: string;
}) {
  const t = useTranslations("studio");
  const ref = useRef<HTMLDivElement>(null);
  const pos = useMotionValue(0.5);

  const clip = useTransform(pos, (v) => `inset(0 ${(1 - v) * 100}% 0 0)`);
  const left = useTransform(pos, (v) => `${v * 100}%`);

  const moveTo = (clientX: number, spring = false) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const v = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    if (spring) animate(pos, v, springSnappy);
    else pos.set(v);
  };

  return (
    <div
      ref={ref}
      className="checkerboard relative h-full w-full touch-none select-none overflow-hidden"
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        moveTo(e.clientX, true);
      }}
      onPointerMove={(e) => {
        if (e.buttons === 1) moveTo(e.clientX);
      }}
    >
      {/* after (full) */}
      <img
        src={afterUrl}
        alt=""
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
      />
      {/* before (clipped) */}
      <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
        <div className="absolute inset-0 bg-surface-soft" />
        <img
          src={beforeUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
        />
      </motion.div>

      {/* divider */}
      <motion.div
        className="absolute inset-y-0 z-10 w-px -translate-x-1/2 bg-black"
        style={{ left }}
      >
        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black bg-white shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 7-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </div>
      </motion.div>

      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black px-2.5 py-1 text-[11px] font-medium text-white">
        {t("before")}
      </span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black px-2.5 py-1 text-[11px] font-medium text-white">
        {t("after")}
      </span>
    </div>
  );
}
