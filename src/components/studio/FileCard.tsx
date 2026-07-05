"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { spring, springSnappy } from "@/lib/motion";
import { useStudio } from "@/lib/store";
import { downloadBlob, outputName } from "@/lib/download";
import { formatBytesShort } from "@/lib/sniff";
import type { StudioFile } from "@/lib/types";
import {
  AlertIcon,
  CheckIcon,
  DownloadIcon,
  SpinnerIcon,
  XIcon,
} from "@/components/icons";

export function FileCard({ sf }: { sf: StudioFile }) {
  const t = useTranslations("studio");
  const selected = useStudio((s) => s.selectedId === sf.id);
  const selectFile = useStudio((s) => s.selectFile);
  const removeFile = useStudio((s) => s.removeFile);

  const savings =
    sf.result && sf.bytes > 0 ? 1 - sf.result.bytes / sf.bytes : null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={spring}
      onClick={() => selectFile(sf.id)}
      className={`group relative cursor-pointer overflow-hidden rounded-xl border bg-white transition-shadow ${
        selected
          ? "border-black shadow-[0_0_0_1.5px_#000]"
          : "border-hairline hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
      }`}
    >
      {/* thumb */}
      <div className="checkerboard relative aspect-square w-full overflow-hidden">
        {sf.previewUrl && (
          <img
            src={sf.status === "done" && sf.result ? sf.result.url : sf.previewUrl}
            alt={sf.name}
            draggable={false}
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}

        {(sf.status === "processing" || sf.status === "queued") && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
            {sf.status === "processing" ? (
              <SpinnerIcon size={20} className="text-black" />
            ) : (
              <span className="text-[11px] font-medium text-black/60">
                {t("queued")}
              </span>
            )}
          </div>
        )}

        {sf.status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-block-pink/90 px-3 text-center">
            <AlertIcon size={17} className="text-black/70" />
            <span className="text-[10.5px] font-medium leading-tight text-black/75">
              {sf.error === "unsupportedLossless"
                ? t("errorUnsupportedLossless")
                : sf.error === "engine"
                  ? t("errorEngine")
                  : t("errorGeneric")}
            </span>
          </div>
        )}

        {/* remove */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={springSnappy}
          onClick={(e) => {
            e.stopPropagation();
            removeFile(sf.id);
          }}
          aria-label={t("remove")}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
        >
          <XIcon size={11} />
        </motion.button>

        {/* savings badge */}
        {sf.status === "done" && savings !== null && Math.abs(savings) > 0.005 && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springSnappy}
            className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tabular-nums text-black ${
              savings > 0 ? "bg-block-lime" : "bg-block-coral"
            }`}
          >
            {savings > 0
              ? `−${Math.round(savings * 100)}%`
              : `+${Math.round(-savings * 100)}%`}
          </motion.span>
        )}
      </div>

      {/* meta */}
      <div className="flex items-center gap-1.5 border-t border-hairline-soft px-2 py-1.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium">{sf.name}</p>
          <p className="text-[10px] leading-snug tabular-nums text-ink-faint">
            {formatBytesShort(sf.bytes)}
            {sf.result && (
              <>
                {"\u2009→\u2009"}
                <span className="whitespace-nowrap text-black/60">
                  {formatBytesShort(sf.result.bytes)}
                </span>
              </>
            )}
          </p>
        </div>

        {sf.status === "done" && sf.result && (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            transition={springSnappy}
            onClick={(e) => {
              e.stopPropagation();
              downloadBlob(sf.result!.blob, outputName(sf));
            }}
            aria-label={t("download")}
            className="flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-full bg-black text-white"
          >
            <DownloadIcon size={12} />
          </motion.button>
        )}
        {sf.status === "done" && !sf.result && <CheckIcon size={13} />}
      </div>
    </motion.div>
  );
}
