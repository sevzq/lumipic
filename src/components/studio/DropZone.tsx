"use client";

import { useRef } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { spring } from "@/lib/motion";
import { ACCEPTED_INPUT } from "@/lib/sniff";
import { PlusIcon } from "@/components/icons";

export function DropZone({
  onFiles,
  compact = false,
}: {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}) {
  const t = useTranslations("studio");
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => inputRef.current?.click();

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_INPUT}
      multiple
      hidden
      onChange={(e) => {
        onFiles(Array.from(e.target.files ?? []));
        e.target.value = "";
      }}
    />
  );

  if (compact) {
    return (
      <>
        {input}
        <motion.button
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.98 }}
          transition={spring}
          onClick={openPicker}
          className="flex shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/20 bg-white/60 px-4 py-3.5 text-[13px] font-medium text-black/70 transition-colors hover:border-black/50 hover:text-black"
        >
          <PlusIcon size={16} />
          {t("addMore")}
        </motion.button>
      </>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay: 0.04 }}
    >
      {input}
      <motion.button
        onClick={openPicker}
        whileHover="hover"
        whileTap={{ scale: 0.995 }}
        className="group relative block w-full cursor-pointer rounded-[20px] border-2 border-dashed border-black/25 bg-white transition-colors hover:border-black sm:rounded-[24px]"
      >
        <div className="relative flex flex-col items-center gap-4 px-6 py-14 sm:py-16">
          <motion.div
            variants={{ hover: { scale: 1.06, rotate: -3 } }}
            animate={{ y: [0, -6, 0] }}
            transition={{
              y: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              scale: spring,
              rotate: spring,
            }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-black"
          >
            <PlusIcon size={26} className="text-white" />
          </motion.div>

          <div className="space-y-1.5 text-center">
            <p className="text-lg font-semibold tracking-tight sm:text-[21px]">
              {t("dropTitle")}
            </p>
            <p className="text-sm text-ink-soft">
              {t("dropOr")}{" "}
              <span className="font-semibold text-black underline underline-offset-4">
                {t("browse")}
              </span>
            </p>
          </div>

          <p className="hidden text-[12px] text-ink-faint sm:block">
            {t("pasteHint")}
          </p>
          <p className="eyebrow text-black/40">{t("supported")}</p>
        </div>
      </motion.button>
    </motion.div>
  );
}
