import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { C, EASE_OUT } from "./theme";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700", "800"],
});

export const FONT = fontFamily;

/** Stage backdrop: white canvas with a faint pastel wash in one corner. */
export const Stage: React.FC<{ tint?: string; children: React.ReactNode }> = ({
  tint,
  children,
}) => (
  <AbsoluteFill
    style={{
      backgroundColor: C.canvas,
      fontFamily: FONT,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    {tint ? (
      <AbsoluteFill
        style={{
          background: `radial-gradient(900px 600px at 85% -10%, ${tint}55, transparent 70%)`,
        }}
      />
    ) : null}
    {children}
  </AbsoluteFill>
);

/** Transparency checkerboard, same look as the app viewer. */
export const Checker: React.FC<{ size?: number; style?: React.CSSProperties }> = ({
  size = 22,
  style,
}) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage: `conic-gradient(#ececec 0 25%, #ffffff 0 50%, #ececec 0 75%, #ffffff 0)`,
      backgroundSize: `${size * 2}px ${size * 2}px`,
      ...style,
    }}
  />
);

/** White rounded card with hairline border — the app's surface language. */
export const Card: React.FC<{
  width: number;
  height: number;
  radius?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ width, height, radius = 28, style, children }) => (
  <div
    style={{
      position: "relative",
      width,
      height,
      borderRadius: radius,
      background: C.canvas,
      border: `1.5px solid ${C.hairline}`,
      boxShadow: "0 24px 70px rgba(0,0,0,0.10)",
      overflow: "hidden",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Black pill label, like the app's primary buttons. */
export const Pill: React.FC<{
  children: React.ReactNode;
  bg?: string;
  color?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, bg = C.ink, color = "#fff", size = 30, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 12,
      borderRadius: 999,
      background: bg,
      color,
      fontSize: size,
      fontWeight: 650,
      padding: `${size * 0.55}px ${size * 1.1}px`,
      letterSpacing: -0.2,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Springy pop-in helper (scale + fade), driven by interpolate. */
export const usePop = (from: number, dur = 14) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [from, from + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.22, 1.4, 0.36, 1),
  });
  const o = interpolate(frame, [from, from + Math.min(8, dur)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { scale: t, opacity: o };
};

/** Ease-out progress between two frames. */
export const useProgress = (
  from: number,
  to: number,
  easing: (t: number) => number = Easing.bezier(...EASE_OUT),
) => {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
};

export const ZapGlyph: React.FC<{ size?: number; color?: string }> = ({
  size = 30,
  color = "#fff",
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />
  </svg>
);

export const CheckGlyph: React.FC<{ size?: number; color?: string }> = ({
  size = 30,
  color = "#fff",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4.5 12.5 10 18 19.5 6.5" />
  </svg>
);
