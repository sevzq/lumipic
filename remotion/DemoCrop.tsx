import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C } from "./theme";
import { Card, Pill, Stage, usePop, useProgress } from "./ui";

/**
 * Crop demo: a magenta marquee draws over the photo, everything outside
 * dims, then the crop snaps to fill the card. 1280x800 · 210f.
 */
export const DemoCrop: React.FC = () => {
  const frame = useCurrentFrame();
  const photoIn = useProgress(0, 20, Easing.bezier(0.22, 1.2, 0.36, 1));

  const W = 860;
  const H = 480;

  // Crop rect target (centered on the dog)
  const rect = { x: 0.30, y: 0.10, w: 0.42, h: 0.80 };

  // Marquee draw 35..85
  const draw = useProgress(35, 85, Easing.bezier(0.3, 0, 0.2, 1));
  const rx = rect.x * W;
  const ry = rect.y * H;
  const rw = rect.w * W * draw;
  const rh = rect.h * H * draw;

  // Apply: zoom the cropped region to fill 120..150
  const apply = useProgress(120, 150, Easing.bezier(0.22, 1.1, 0.36, 1));
  const scale = 1 + apply * (1 / rect.w - 1) * 0.72;
  const cx = (0.5 - (rect.x + rect.w / 2)) * W * apply * 0.72;
  const cy = (0.5 - (rect.y + rect.h / 2)) * H * apply * 0.72;

  const done = usePop(158, 14);

  return (
    <Stage tint={C.mint}>
      <div style={{ opacity: photoIn, translate: `0px ${(1 - photoIn) * 36}px` }}>
        <Card width={W} height={H} radius={30}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              scale: String(scale),
              translate: `${cx}px ${cy}px`,
            }}
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
          </div>

          {/* Marquee while selecting; huge shadow dims everything outside */}
          {apply < 0.02 ? (
            <>
              <div
                style={{
                  position: "absolute",
                  left: rx,
                  top: ry,
                  width: rw,
                  height: rh,
                  border: `3px solid ${C.magenta}`,
                  borderRadius: 6,
                  boxShadow: `0 0 0 2000px rgba(0,0,0,${0.38 * draw})`,
                  opacity: draw > 0.02 ? 1 : 0,
                }}
              >
                {/* Corner handles */}
                {[
                  { left: -9, top: -9 },
                  { right: -9, top: -9 },
                  { left: -9, bottom: -9 },
                  { right: -9, bottom: -9 },
                ].map((pos, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      background: "#fff",
                      border: `3px solid ${C.ink}`,
                      ...pos,
                    }}
                  />
                ))}
              </div>
            </>
          ) : null}

          <div
            style={{
              position: "absolute",
              bottom: 26,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div style={{ scale: String(done.scale), opacity: done.opacity }}>
              <Pill size={28} bg={C.mint} color={C.ink}>
                Cropped — original format kept
              </Pill>
            </div>
          </div>
        </Card>
      </div>
    </Stage>
  );
};

export const CROP_DURATION = 210;
