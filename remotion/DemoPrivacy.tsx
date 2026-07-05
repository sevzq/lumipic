import React from "react";
import { Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C } from "./theme";
import { Card, Pill, Stage, usePop, useProgress } from "./ui";

/**
 * Privacy demo on the navy panel: the photo tries to fly toward a "cloud",
 * bounces off a struck-through upload path, and settles inside a laptop
 * frame with "100% local" stamped on. 1280x800 · 210f.
 */
export const DemoPrivacy: React.FC = () => {
  const frame = useCurrentFrame();
  const enter = useProgress(0, 20, Easing.bezier(0.22, 1.2, 0.36, 1));

  // The dashed upload path draws, then gets slashed
  const path = useProgress(30, 60);
  const slash = useProgress(66, 80, Easing.bezier(0.34, 1.56, 0.64, 1));

  // Photo tries to leave (30..64), bounces back (64..92)
  const attempt = interpolate(frame, [34, 64, 92], [0, 0.34, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.34, 1.2, 0.64, 1),
  });

  const stamp = usePop(120, 16);
  const zeros = usePop(146, 14);

  return (
    <Stage>
      {/* Navy backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: C.navy,
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 90,
          opacity: enter,
          translate: `0px ${(1 - enter) * 36}px`,
        }}
      >
        {/* Device with the photo inside */}
        <div
          style={{
            position: "relative",
            borderRadius: 34,
            border: "2px solid rgba(255,255,255,0.25)",
            padding: 22,
            background: "rgba(255,255,255,0.06)",
          }}
        >
          <Card
            width={560}
            height={380}
            radius={22}
            style={{
              boxShadow: "0 30px 90px rgba(0,0,0,0.5)",
              translate: `${attempt * 320}px ${attempt * -60}px`,
              rotate: `${attempt * 8}deg`,
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
          </Card>
          <div
            style={{
              position: "absolute",
              bottom: -26,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div style={{ scale: String(stamp.scale), opacity: stamp.opacity }}>
              <Pill size={28} bg={C.lime} color={C.ink}>
                100% on-device
              </Pill>
            </div>
          </div>
        </div>

        {/* Upload path + cloud, crossed out */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 30,
          }}
        >
          <svg width={280} height={190} viewBox="0 0 280 190">
            {/* Cloud */}
            <path
              d="M75 130a45 45 0 0 1 8-89 62 62 0 0 1 118-10 50 50 0 0 1-4 99H75Z"
              fill="none"
              stroke="rgba(255,255,255,0.5)"
              strokeWidth={5}
              strokeDasharray="14 12"
              strokeDashoffset={interpolate(path, [0, 1], [600, 0])}
            />
            {/* Slash */}
            <line
              x1={30}
              y1={170}
              x2={250}
              y2={16}
              stroke={C.magenta}
              strokeWidth={12}
              strokeLinecap="round"
              strokeDasharray={280}
              strokeDashoffset={280 - slash * 280}
            />
          </svg>
          <div style={{ scale: String(zeros.scale), opacity: zeros.opacity }}>
            <div
              style={{
                color: "#fff",
                fontSize: 34,
                fontWeight: 750,
                letterSpacing: -0.5,
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              0 uploads
              <div style={{ fontSize: 22, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>
                No account · No server · Free
              </div>
            </div>
          </div>
        </div>
      </div>
    </Stage>
  );
};

export const PRIVACY_DURATION = 210;
