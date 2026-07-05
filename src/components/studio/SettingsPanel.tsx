"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { springSnappy } from "@/lib/motion";
import { useStudio } from "@/lib/store";
import type { OutputFormat, ToolMode } from "@/lib/types";

function Slider({
  label,
  value,
  min,
  max,
  suffix = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex min-w-0 flex-1 items-center gap-3 sm:min-w-[220px]">
      <span className="shrink-0 text-[13px] font-medium text-black/70">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1"
      />
      <span className="w-11 shrink-0 text-right font-mono text-[12.5px] font-semibold tabular-nums">
        {value}
        {suffix}
      </span>
    </label>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Partial<Record<T, string>>;
}) {
  return (
    <div className="flex shrink-0 rounded-full border border-hairline bg-surface-soft p-1">
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`relative rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              active ? "text-white" : "text-black/60 hover:text-black"
            }`}
          >
            {active && (
              <motion.span
                layoutId="seg-pill"
                transition={springSnappy}
                className="absolute inset-0 rounded-full bg-black"
              />
            )}
            <span className="relative uppercase">{labels?.[opt] ?? opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex shrink-0 items-center gap-2.5"
      role="switch"
      aria-checked={checked}
    >
      <span
        className="relative h-6 w-11 shrink-0 rounded-full transition-colors"
        style={{ background: checked ? "#000000" : "rgba(0,0,0,0.15)" }}
      >
        <motion.span
          animate={{ x: checked ? 22 : 2 }}
          transition={springSnappy}
          className="absolute top-[2px] left-0 h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.3)]"
        />
      </span>
      <span className="text-left">
        <span className="block text-[13px] font-medium text-black">{label}</span>
        {hint && (
          <span className="block text-[11px] text-ink-faint">{hint}</span>
        )}
      </span>
    </button>
  );
}

export function SettingsPanel({ mode }: { mode: ToolMode }) {
  const t = useTranslations("settings");
  const settings = useStudio((s) => s.settings);
  const updateSettings = useStudio((s) => s.updateSettings);

  if (mode !== "compress" && mode !== "convert") return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center gap-x-7 gap-y-3.5 rounded-2xl border border-hairline bg-white px-5 py-3.5"
    >
      {mode === "compress" && (
        <>
          {/* slider shows compression strength: right = smaller file */}
          <Slider
            label={t("strength")}
            value={100 - settings.compress.quality}
            min={0}
            max={90}
            onChange={(strength) =>
              updateSettings({ compress: { quality: 100 - strength } as never })
            }
          />
          <Toggle
            label={t("pngLossy")}
            hint={t("pngLossyHint")}
            checked={settings.compress.pngLossy}
            onChange={(pngLossy) =>
              updateSettings({ compress: { pngLossy } as never })
            }
          />
        </>
      )}

      {mode === "convert" && (
        <>
          <Segmented<OutputFormat>
            options={["png", "jpeg", "webp", "avif"]}
            labels={{ jpeg: "JPG" }}
            value={settings.convert.format}
            onChange={(format) => updateSettings({ convert: { format } as never })}
          />
          {settings.convert.format !== "png" && (
            <Slider
              label={t("quality")}
              value={settings.convert.quality}
              min={1}
              max={100}
              onChange={(quality) =>
                updateSettings({ convert: { quality } as never })
              }
            />
          )}
        </>
      )}
    </motion.div>
  );
}
