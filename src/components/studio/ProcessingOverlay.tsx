"use client";

import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { spring } from "@/lib/motion";
import { useStudio } from "@/lib/store";
import { SpinnerIcon } from "@/components/icons";

/**
 * Full-screen modal shown while jobs are running. It intentionally blocks
 * every interaction so settings / files can't change mid-batch.
 */
export function ProcessingOverlay() {
  const t = useTranslations("studio");
  const te = useTranslations("engine");
  const files = useStudio((s) => s.files);
  const engine = useStudio((s) => s.engine);
  const mode = useStudio((s) => s.mode);

  const busy = files.filter(
    (f) => f.status === "processing" || f.status === "queued",
  ).length;
  const settled = files.filter(
    (f) => f.status === "done" || f.status === "error",
  ).length;

  // Count only the current batch: files that were already done when this
  // batch started must not inflate the "processing x / y" numbers.
  const show = busy > 0;
  const baseline = useRef(0);
  const wasShowing = useRef(false);
  if (show && !wasShowing.current) baseline.current = settled;
  wasShowing.current = show;

  const batchTotal = busy + settled - baseline.current;
  const batchDone = Math.min(settled - baseline.current + 1, batchTotal);

  const engineLoading = mode === "remove-bg" && engine.kind === "loading";
  const progress = engineLoading
    ? engine.kind === "loading"
      ? engine.progress
      : 0
    : batchTotal > 0
      ? (settled - baseline.current) / batchTotal
      : 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6 backdrop-blur-[2px]"
          aria-modal
          role="dialog"
        >
          <motion.div
            initial={{ scale: 0.92, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={spring}
            className="w-full max-w-sm rounded-[28px] bg-white p-8 text-center shadow-[0_24px_80px_-16px_rgba(0,0,0,0.5)]"
          >
            <SpinnerIcon size={30} className="mx-auto text-black" />

            <p className="mt-5 text-[17px] font-semibold tracking-tight">
              {engineLoading
                ? te("loadingTitle")
                : t("processingCount", { done: batchDone, total: batchTotal })}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
              {engineLoading ? te("loadingDesc") : t("processingHint")}
            </p>

            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-black/10">
              <motion.div
                className="h-full rounded-full bg-black"
                animate={{ width: `${Math.max(4, progress * 100)}%` }}
                transition={{ ease: "easeOut", duration: 0.3 }}
              />
            </div>
            {engineLoading && (
              <p className="eyebrow mt-3 text-black/45">
                {Math.round(progress * 100)}%
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
