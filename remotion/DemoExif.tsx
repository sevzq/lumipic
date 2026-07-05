import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C } from "./theme";
import { Card, Pill, Stage, usePop, useProgress, CheckGlyph } from "./ui";

const TAGS = [
  { label: "GPS  34.05°N 118.24°W", gone: 70 },
  { label: "Apple iPhone 17 Pro", gone: 88 },
  { label: "2026:07:04 18:32:11", gone: 106 },
  { label: "f/1.8 · ISO 200 · 24mm", gone: 124 },
];

/**
 * EXIF demo: metadata tags hang off the photo, then get swept away one by
 * one; a "0 metadata" pill lands. 1280x800 · 210f.
 */
export const DemoExif: React.FC = () => {
  const frame = useCurrentFrame();
  const photoIn = useProgress(0, 20, Easing.bezier(0.22, 1.2, 0.36, 1));
  const done = usePop(150, 14);

  return (
    <Stage tint={C.cream}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 60,
          opacity: photoIn,
          translate: `0px ${(1 - photoIn) * 36}px`,
        }}
      >
        <Card width={620} height={430} radius={30}>
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
          <div
            style={{
              position: "absolute",
              bottom: 24,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div style={{ scale: String(done.scale), opacity: done.opacity }}>
              <Pill size={26}>
                <CheckGlyph size={26} color={C.lime} />
                0 metadata left
              </Pill>
            </div>
          </div>
        </Card>

        {/* Tag column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {TAGS.map((tag, i) => {
            const inAt = 24 + i * 8;
            const enter = interpolate(frame, [inAt, inAt + 12], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.22, 1.2, 0.36, 1),
            });
            const leave = interpolate(frame, [tag.gone, tag.gone + 14], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.6, 0, 0.8, 0.4),
            });
            return (
              <div
                key={tag.label}
                style={{
                  opacity: enter * (1 - leave),
                  translate: `${(1 - enter) * 40 + leave * 140}px 0px`,
                  rotate: `${leave * 6}deg`,
                }}
              >
                <div
                  style={{
                    fontFamily:
                      "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 24,
                    fontWeight: 500,
                    color: C.inkSoft,
                    background: "#fff",
                    border: `1.5px solid ${C.hairline}`,
                    borderRadius: 14,
                    padding: "16px 24px",
                    whiteSpace: "nowrap",
                    textDecoration: leave > 0.15 ? "line-through" : "none",
                  }}
                >
                  {tag.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

export const EXIF_DURATION = 210;
