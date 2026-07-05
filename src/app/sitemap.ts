import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const PATHS = [
  "",
  "/remove-bg",
  "/compress",
  "/convert",
  "/crop",
  "/strip-exif",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.flatMap((path) => {
    const en = `${SITE_URL}${path || "/"}`;
    const zh = `${SITE_URL}/zh${path}`;
    const alternates = { languages: { en, zh } };
    return [
      {
        url: en,
        changeFrequency: "weekly" as const,
        priority: path === "" ? 1 : 0.8,
        alternates,
      },
      {
        url: zh,
        changeFrequency: "weekly" as const,
        priority: path === "" ? 0.9 : 0.7,
        alternates,
      },
    ];
  });
}
