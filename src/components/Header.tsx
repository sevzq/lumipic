"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { TOOLS } from "@/lib/tools";
import { LogoMark } from "@/components/Logo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

export function Header() {
  const t = useTranslations("tools");
  const tc = useTranslations("common");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <span className="text-[16px] font-semibold tracking-tight">
            {tc("appName")}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {TOOLS.map((tool) => {
            const active = pathname === tool.path;
            return (
              <Link
                key={tool.mode}
                href={tool.path}
                className={`rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                  active
                    ? "bg-black text-white"
                    : "text-black/70 hover:bg-surface-soft hover:text-black"
                }`}
              >
                {t(`${tool.mode}.name`)}
              </Link>
            );
          })}
        </nav>

        <LocaleSwitcher />
      </div>
    </header>
  );
}
