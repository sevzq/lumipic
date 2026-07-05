import type { Metadata } from "next";
import { ToolPage } from "@/components/ToolPage";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return pageMetadata(locale, "strip-exif", "/strip-exif");
}

export default async function Page({ params }: Props) {
  const { locale } = await params;
  return <ToolPage locale={locale} mode="strip-exif" />;
}
