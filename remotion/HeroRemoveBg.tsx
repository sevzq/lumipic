import React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { C } from "./theme";
import { Card, Checker, Pill, Stage, useProgress, usePop, ZapGlyph } from "./ui";

/**
 * Hero demo: a photo drops in, an AI scan sweeps across, the background
 * dissolves to the transparency checkerboard, a "Transparent PNG" pill lands.
 * 1600x900 · 30fps · 255 frames (~8.5s)
 */
export const HeroRemoveBg: React.FC = () => {
  const frame = useCurrentFrame();

  const CARD_W = 1150;
  const CARD_H = 660;

  // Photo entrance
  const enter = useProgress(0, 22, Easing.bezier(0.22, 1.2, 0.36, 1));

  // Scan sweep 45 -> 110 (normalized 0..1 across the card)
  const scan = useProgress(45, 110);
  const scanX = scan * CARD_W;
  const scanVisible = frame >= 42 && frame <= 116;

  // Subject bounce once the cut is done
  const bounce = interpolate(frame, [118, 130, 142], [1, 1.035, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
  });

  const pill = usePop(140, 16);
  const badge = usePop(158, 14);

  return (
    <Stage tint={C.lilac}>
      <div
        style={{
          scale: String(0.94 + enter * 0.06),
          opacity: enter,
          translate: `0px ${(1 - enter) * 40}px`,
        }}
      >
        <Card width={CARD_W} height={CARD_H} radius={36}>
          {/* Checkerboard revealed left of the scan line */}
          <Checker size={26} />

          {/* Original photo, clipped to the right of the scan line */}
          <Img
            src={staticFile("corgi.png")}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              clipPath: `inset(0 0 0 ${(scanX / CARD_W) * 100}%)`,
            }}
          />

          {/* Cutout subject on the processed side */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              clipPath: `inset(0 ${100 - (scanX / CARD_W) * 100}% 0 0)`,
            }}
          >
            <Img
              src={staticFile("corgi-cut.png")}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                scale: String(bounce),
              }}
            />
          </div>

          {/* Scan beam */}
          {scanVisible ? (
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: scanX - 3,
                width: 6,
                borderRadius: 3,
                background: C.ink,
                boxShadow: `0 0 0 2px rgba(255,255,255,0.65), 0 0 44px 10px ${C.lilac}`,
              }}
            />
          ) : null}

          {/* Engine chip, top-left */}
          <div
            style={{
              position: "absolute",
              top: 28,
              left: 28,
              opacity: interpolate(frame, [28, 40], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            <Pill size={24} style={{ gap: 10 }}>
              <ZapGlyph size={24} color={C.lime} />
              On-device AI
            </Pill>
          </div>

          {/* Result pill, bottom-center */}
          <div
            style={{
              position: "absolute",
              bottom: 34,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              gap: 18,
            }}
          >
            <div style={{ scale: String(pill.scale), opacity: pill.opacity }}>
              <Pill size={30}>Transparent PNG</Pill>
            </div>
            <div style={{ scale: String(badge.scale), opacity: badge.opacity }}>
              <Pill size={30} bg={C.lime} color={C.ink}>
                Hair-level edges
              </Pill>
            </div>
          </div>
        </Card>
      </div>
    </Stage>
  );
};

export const HERO_DURATION = 255;

export const HeroFrame: React.FC = () => (
  <AbsoluteFill>
    <HeroRemoveBg />
  </AbsoluteFill>
);
