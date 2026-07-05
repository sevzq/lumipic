"use client";

import { useEffect, useRef } from "react";

/** Autoplaying looped demo clip that only runs while visible on screen. */
export function DemoVideo({
  src,
  className,
  ratio,
}: {
  src: string;
  className?: string;
  /** intrinsic aspect ratio (e.g. "16 / 9") — reserves space before load */
  ratio?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      className={className}
      style={ratio ? { aspectRatio: ratio } : undefined}
    />
  );
}
