"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { spring } from "@/lib/motion";
import { TOOLS, toolByMode } from "@/lib/tools";
import type { ToolMode } from "@/lib/types";
import { Studio } from "@/components/studio/Studio";
import { TOOL_ICONS } from "@/components/icons";

/**
 * The tool workspace: an oversized pastel color-block (Figma-editorial
 * signature) that hosts the Studio. On the landing page a pill switcher
 * changes tools in place — no navigation, files are kept.
 */
export function Workbench({
  initialMode,
  switchable = false,
}: {
  initialMode: ToolMode;
  switchable?: boolean;
}) {
  const [mode, setMode] = useState<ToolMode>(initialMode);
  const t = useTranslations("tools");
  const hue = toolByMode(mode).hue;

  return (
    <div>
      {switchable && (
        <div
          className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]"
          role="tablist"
        >
          {TOOLS.map((tool) => {
            const active = tool.mode === mode;
            const Icon = TOOL_ICONS[tool.mode];
            return (
              <button
                key={tool.mode}
                role="tab"
                aria-selected={active}
                onClick={() => setMode(tool.mode)}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[13.5px] font-medium transition-colors ${
                  active
                    ? "border-black text-white"
                    : "border-hairline bg-white text-black/70 hover:border-black/30 hover:text-black"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="wb-pill"
                    transition={spring}
                    className="absolute inset-0 rounded-full bg-black"
                  />
                )}
                <Icon size={15} className="relative" />
                <span className="relative whitespace-nowrap">
                  {t(`${tool.mode}.name`)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <motion.div
        layout
        animate={{ backgroundColor: hue }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        className="rounded-[24px] p-3 sm:rounded-[32px] sm:p-5"
        style={{ backgroundColor: hue }}
      >
        <Studio mode={mode} />
      </motion.div>
    </div>
  );
}
