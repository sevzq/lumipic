import type { SVGProps } from "react";
import type { ToolMode } from "@/lib/types";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const WandIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 4V2m0 12v-2m-6-5H7m14 0h-2m-2.9-3.1 1.4-1.4M9.5 9.5 4 15l5 5 5.5-5.5M17.1 6.9l-7.6 7.6" />
    <path d="m19 15 .55 1.45L21 17l-1.45.55L19 19l-.55-1.45L17 17l1.45-.55L19 15Z" />
  </svg>
);

export const CompressIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 14h6v6M20 10h-6V4M14 10l6-6M4 20l6-6" />
  </svg>
);

export const ConvertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M17 2.5 21 6.5l-4 4" />
    <path d="M21 6.5H8a4 4 0 0 0-4 4V12" />
    <path d="M7 21.5l-4-4 4-4" />
    <path d="M3 17.5h13a4 4 0 0 0 4-4V12" />
  </svg>
);

export const CropIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 2v14a2 2 0 0 0 2 2h14" />
    <path d="M2 6h14a2 2 0 0 1 2 2v14" />
  </svg>
);

export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2.5 4.5 5.4v5.3c0 4.6 3.2 8.9 7.5 10.3 4.3-1.4 7.5-5.7 7.5-10.3V5.4L12 2.5Z" />
    <path d="m9 11.6 2.1 2.1L15.4 9" />
  </svg>
);

export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v12m0 0 4.5-4.5M12 15 7.5 10.5M4 17.5v1A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-1" />
  </svg>
);

export const XIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2m3.5 0-.8 12a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.5 7M10 11.5v5M14 11.5v5" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4.5v15l12-7.5L7 4.5Z" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const AlertIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 9v4.5m0 3v.1M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </svg>
);

export const GlobeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.5 12h17M12 3.2c2.4 2.3 3.7 5.4 3.7 8.8s-1.3 6.5-3.7 8.8c-2.4-2.3-3.7-5.4-3.7-8.8S9.6 5.5 12 3.2Z" />
  </svg>
);

export const ZapIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 2.5 4.5 13.5H11l-.9 8L18.7 10.5H12l1-8Z" />
  </svg>
);

export const LockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7M12 14.5v2.5" />
  </svg>
);

export const HeartIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 20.5c-5.5-3.6-8.5-6.9-8.5-10.4A4.6 4.6 0 0 1 8.1 5.5c1.6 0 3 .8 3.9 2a4.8 4.8 0 0 1 3.9-2 4.6 4.6 0 0 1 4.6 4.6c0 3.5-3 6.8-8.5 10.4Z" />
  </svg>
);

export const SpinnerIcon = ({ size = 20, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`animate-spin ${props.className ?? ""}`}
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke="currentColor"
      strokeOpacity="0.2"
      strokeWidth="2.5"
    />
    <path
      d="M21 12a9 9 0 0 0-9-9"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
  </svg>
);

export const TOOL_ICONS: Record<ToolMode, (p: IconProps) => React.ReactElement> = {
  "remove-bg": WandIcon,
  compress: CompressIcon,
  convert: ConvertIcon,
  crop: CropIcon,
  "strip-exif": ShieldIcon,
};
