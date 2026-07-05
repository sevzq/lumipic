import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C } from "./theme";
import { Card, Pill, Stage, usePop, useProgress } from "./ui";

/**
 * Compress demo: strength slider sweeps right, the file size counter rolls
 * from 4.20 MB down to 0.84 MB, a lime "-80%" badge pops. 1280x800 · 210f.
 */
export const DemoCompress: React.FC = () => {
  const frame = useCurrentFrame();

  // Slider sweep
  const slide = useProgress(40, 100, Easing.bezier(0.3, 0, 0.2, 1));
  const pct = 0.12 + slide * 0.76;

  // Size rolls down with the slider
  const size = 4.2 - slide * 3.36;
  const saved = Math.round((1 - size / 4.2) * 100);

  const photoIn = useProgress(0, 20, Easing.bezier(0.22, 1.2, 0.36, 1));
  const badge = usePop(108, 14);
  const squeeze = interpolate(frame, [96, 108, 122], [1, 0.97, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });

  return (
    <Stage tint={C.lime}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 44,
          opacity: photoIn,
          translate: `0px ${(1 - photoIn) * 36}px`,
        }}
      >
        <Card width={760} height={430} radius={30} style={{ scale: String(squeeze) }}>
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
          {/* Size ticker */}
          <div
            style={{
              position: "absolute",
              right: 24,
              bottom: 24,
              display: "flex",
              gap: 14,
              alignItems: "center",
            }}
          >
            <Pill size={26} style={{ fontVariantNumeric: "tabular-nums" }}>
              {size.toFixed(2)} MB
            </Pill>
            <div style={{ scale: String(badge.scale), opacity: badge.opacity }}>
              <Pill size={26} bg={C.lime} color={C.ink}>
                -{saved}%
              </Pill>
            </div>
          </div>
        </Card>

        {/* Strength slider */}
        <div style={{ width: 620 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 16,
              fontSize: 24,
              fontWeight: 600,
              color: C.inkSoft,
            }}
          >
            <span>Compression</span>
            <span style={{ fontVariantNumeric: "tabular-nums", color: C.ink }}>
              {Math.round(pct * 100)}
            </span>
          </div>
          <div
            style={{
              position: "relative",
              height: 10,
              borderRadius: 999,
              background: C.hairline,
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: `${pct * 100}%`,
                borderRadius: 999,
                background: C.ink,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${pct * 100}%`,
                width: 30,
                height: 30,
                borderRadius: 999,
                background: "#fff",
                border: `3px solid ${C.ink}`,
                translate: "-50% -50%",
                boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
              }}
            />
          </div>
        </div>
      </div>
    </Stage>
  );
};

export const COMPRESS_DURATION = 210;
