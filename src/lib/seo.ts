import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const SITE_URL = "https://pic.sevzq.com";

export async function pageMetadata(
  locale: string,
  key: string,
  path: string,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "seo" });
  const en = `${SITE_URL}${path || "/"}`;
  const zh = `${SITE_URL}/zh${path}` + (path ? "" : "");
  const url = locale === "zh" ? zh : en;

  return {
    metadataBase: new URL(SITE_URL),
    title: t(`${key}.title`),
    description: t(`${key}.description`),
    alternates: {
      canonical: url,
      languages: { en, zh, "x-default": en },
    },
    openGraph: {
      title: t(`${key}.title`),
      description: t(`${key}.description`),
      url,
      siteName: "LumiPic",
      type: "website",
    },
    twitter: { card: "summary_large_image" },
  };
}
