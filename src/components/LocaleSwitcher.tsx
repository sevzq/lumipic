"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { GlobeIcon } from "@/components/icons";

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const next = locale === "en" ? "zh" : "en";

  return (
    <button
      onClick={() => router.replace(pathname, { locale: next })}
      className="flex h-9 items-center gap-1.5 rounded-full border border-hairline bg-white px-3.5 text-[13px] font-medium text-black/75 transition-colors hover:border-black/30 hover:text-black"
      aria-label="Switch language"
    >
      <GlobeIcon size={15} />
      {next === "zh" ? "中文" : "EN"}
    </button>
  );
}
