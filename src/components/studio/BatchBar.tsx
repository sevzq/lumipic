"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { spring, springSnappy } from "@/lib/motion";
import { useStudio } from "@/lib/store";
import { downloadAllAsZip } from "@/lib/download";
import { DownloadIcon, PlayIcon, SpinnerIcon, TrashIcon } from "@/components/icons";

export function BatchBar() {
  const t = useTranslations("studio");
  const files = useStudio((s) => s.files);
  const mode = useStudio((s) => s.mode);
  const clearAll = useStudio((s) => s.clearAll);
  const startAll = useStudio((s) => s.startAll);
  const [zipping, setZipping] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Keep the floating bar clear of the footer: once the footer scrolls into
  // view the bar rides up with it, so footer content is never covered.
  useEffect(() => {
    const el = wrapRef.current;
    const footer = document.querySelector("footer");
    if (!el || !footer) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const lift = Math.max(0, window.innerHeight - footer.getBoundingClientRect().top);
      el.style.transform = lift > 0 ? `translateY(${-lift}px)` : "";
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const done = files.filter((f) => f.status === "done").length;
  const busy = files.some(
    (f) => f.status === "processing" || f.status === "queued",
  );
  // Files parked after a tool switch; crop starts per-file from its editor.
  const pending =
    mode === "crop" ? 0 : files.filter((f) => f.status === "ready").length;

  return (
    <div
      ref={wrapRef}
      className="fixed inset-x-0 bottom-4 z-30 will-change-transform sm:bottom-6"
    >
      <motion.div
        initial={{ y: 90, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 90, opacity: 0 }}
        transition={spring}
        className="flex justify-center px-4"
      >
      <div className="flex items-center gap-3 rounded-full border border-hairline bg-white py-2 pl-5 pr-2 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.35)] sm:gap-4">
        <div className="flex items-center gap-2 text-[12.5px] font-medium text-black/60">
          {busy && <SpinnerIcon size={14} className="text-black" />}
          <span className="whitespace-nowrap tabular-nums">
            {t("doneCount", { done, total: files.length })}
          </span>
        </div>

        {pending > 0 && (
          <motion.button
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={springSnappy}
            onClick={startAll}
            className="flex items-center gap-2 rounded-full bg-black px-4.5 py-2 text-[13px] font-semibold text-white"
          >
            <PlayIcon size={14} />
            <span className="whitespace-nowrap">
              {t("startAll", { count: pending })}
            </span>
          </motion.button>
        )}

        {!(pending > 0 && done === 0) && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            transition={springSnappy}
            disabled={done === 0 || zipping}
            onClick={async () => {
              setZipping(true);
              try {
                await downloadAllAsZip(useStudio.getState().files);
              } finally {
                setZipping(false);
              }
            }}
            className="flex items-center gap-2 rounded-full bg-black px-4.5 py-2 text-[13px] font-semibold text-white disabled:opacity-30"
          >
            {zipping ? (
              <SpinnerIcon size={15} className="text-white" />
            ) : (
              <DownloadIcon size={15} />
            )}
            <span className="whitespace-nowrap">
              {done > 1 ? t("downloadZip") : t("downloadAll")}
            </span>
          </motion.button>
        )}

        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          transition={springSnappy}
          onClick={clearAll}
          aria-label={t("clearAll")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-black/55 transition-colors hover:bg-surface-soft hover:text-black"
        >
          <TrashIcon size={16} />
        </motion.button>
      </div>
    </motion.div>
    </div>
  );
}
