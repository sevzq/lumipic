import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/Logo";
import { LockIcon } from "@/components/icons";

export function Footer() {
  const t = useTranslations("footer");
  const tc = useTranslations("common");

  return (
    <footer className="mt-20 border-t border-hairline">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-6 py-10 text-center">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-sm font-semibold">{tc("appName")}</span>
        </div>
        <p className="flex items-center gap-1.5 text-[13px] text-ink-soft">
          <LockIcon size={13} />
          {t("privacy")}
        </p>
        <p className="eyebrow text-black/40">
          © {new Date().getFullYear()} LumiPic · {t("madeWith")}
        </p>
      </div>
    </footer>
  );
}
