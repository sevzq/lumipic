import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C } from "./theme";
import { Card, Pill, Stage, useProgress } from "./ui";

const FORMATS = [
  { name: "HEIC", size: "3.1 MB", bg: C.surfaceSoft, color: C.inkSoft },
  { name: "PNG", size: "8.4 MB", bg: C.surfaceSoft, color: C.inkSoft },
  { name: "JPG", size: "1.6 MB", bg: C.surfaceSoft, color: C.inkSoft },
  { name: "WebP", size: "0.9 MB", bg: C.ink, color: "#fff" },
  { name: "AVIF", size: "0.6 MB", bg: C.ink, color: "#fff" },
];

/**
 * Convert demo: a photo card flips through format chips; the active chip
 * highlights in sequence, ending on AVIF. 1280x800 · 210f.
 */
export const DemoConvert: React.FC = () => {
  const frame = useCurrentFrame();
  const photoIn = useProgress(0, 20, Easing.bezier(0.22, 1.2, 0.36, 1));

  // Which format is active: sweeps 0..4 between frames 40..170
  const activeF = interpolate(frame, [40, 170], [0, FORMATS.length - 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const active = Math.round(activeF);

  // Card does a tiny flip on each switch
  const local = activeF - Math.floor(activeF);
  const flip = Math.sin(local * Math.PI) * 5;

  return (
    <Stage tint={C.coral}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 46,
          opacity: photoIn,
          translate: `0px ${(1 - photoIn) * 36}px`,
        }}
      >
        <Card
          width={720}
          height={430}
          radius={30}
          style={{ rotate: `${flip}deg` }}
        >
          <Img
            src={staticFile("corgi.png")}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div style={{ position: "absolute", left: 24, top: 24 }}>
            <Pill size={28} style={{ fontVariantNumeric: "tabular-nums" }}>
              {FORMATS[active].name} · {FORMATS[active].size}
            </Pill>
          </div>
        </Card>

        {/* Format rail */}
        <div style={{ display: "flex", gap: 18 }}>
          {FORMATS.map((f, i) => {
            const isActive = i === active;
            return (
              <div
                key={f.name}
                style={{
                  borderRadius: 999,
                  padding: "16px 34px",
                  fontSize: 26,
                  fontWeight: 650,
                  background: isActive ? C.ink : "#fff",
                  color: isActive ? "#fff" : C.inkSoft,
                  border: `1.5px solid ${isActive ? C.ink : C.hairline}`,
                  scale: isActive ? "1.08" : "1",
                }}
              >
                {f.name}
              </div>
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

export const CONVERT_DURATION = 210;
