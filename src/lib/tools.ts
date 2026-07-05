import type { ToolMode } from "@/lib/types";

export interface ToolDef {
  mode: ToolMode;
  path: string;
  /** pastel color-block surface for this tool (Figma-editorial palette) */
  hue: string;
  seoKey: string;
}

export const TOOLS: ToolDef[] = [
  { mode: "remove-bg", path: "/remove-bg", hue: "#C5B0F4", seoKey: "remove-bg" },
  { mode: "compress", path: "/compress", hue: "#DCEEB1", seoKey: "compress" },
  { mode: "convert", path: "/convert", hue: "#F3C9B6", seoKey: "convert" },
  { mode: "crop", path: "/crop", hue: "#C8E6CD", seoKey: "crop" },
  { mode: "strip-exif", path: "/strip-exif", hue: "#F4ECD6", seoKey: "strip-exif" },
];

export const toolByMode = (mode: ToolMode): ToolDef =>
  TOOLS.find((t) => t.mode === mode)!;
