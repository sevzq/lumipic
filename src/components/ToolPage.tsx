import { getTranslations, setRequestLocale } from "next-intl/server";
import { Workbench } from "@/components/Workbench";
import type { ToolMode } from "@/lib/types";

export async function ToolPage({
  locale,
  mode,
}: {
  locale: string;
  mode: ToolMode;
}) {
  setRequestLocale(locale);
  const t = await getTranslations("tools");

  return (
    <div className="mx-auto max-w-6xl px-4 pt-9 sm:px-6 sm:pt-12">
      <div className="mb-7 space-y-2.5 text-center">
        <h1 className="display text-[30px] sm:text-[44px]">{t(`${mode}.name`)}</h1>
        <p className="mx-auto max-w-xl text-balance text-[13.5px] leading-relaxed text-ink-soft sm:text-[15px]">
          {t(`${mode}.desc`)}
        </p>
      </div>

      <Workbench initialMode={mode} />
    </div>
  );
}
