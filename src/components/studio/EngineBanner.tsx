"use client";

import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { spring } from "@/lib/motion";
import { useStudio } from "@/lib/store";
import { AlertIcon, ZapIcon } from "@/components/icons";

export function EngineBanner() {
  const t = useTranslations("engine");
  const engine = useStudio((s) => s.engine);

  return (
    <AnimatePresence mode="wait">
      {engine.kind === "ready" && (
        <motion.div
          key={`ready-${engine.tier}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={spring}
          className="flex flex-wrap items-center gap-2 text-[12.5px] font-medium text-black/60"
        >
          <ZapIcon size={13} className="text-success" />
          {t("ready")}
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold text-black ${
              engine.tier === "hd" ? "bg-block-lime" : "bg-block-cream"
            }`}
          >
            {engine.tier === "hd" ? t("tierHd") : t("tierLite")}
          </span>
          {engine.tier === "lite" && (
            <span className="text-[11.5px] text-black/45">{t("tierLiteHint")}</span>
          )}
        </motion.div>
      )}

      {engine.kind === "unavailable" && (
        <motion.div
          key="unavailable"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring}
          className="flex items-start gap-3 rounded-2xl border border-black/10 bg-block-cream px-5 py-4"
        >
          <AlertIcon size={18} className="mt-0.5 shrink-0 text-black/70" />
          <div>
            <p className="text-[13.5px] font-semibold">{t("unavailableTitle")}</p>
            <p className="mt-0.5 text-[12.5px] text-black/60">
              {t("unavailableDesc")}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
