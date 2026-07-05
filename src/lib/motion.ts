/** Apple-feel spring presets, shared across the app. */

export const spring = {
  type: "spring",
  stiffness: 320,
  damping: 28,
  mass: 0.9,
} as const;

export const springSnappy = {
  type: "spring",
  stiffness: 560,
  damping: 34,
} as const;

export const springSoft = {
  type: "spring",
  stiffness: 170,
  damping: 24,
} as const;

export const rise = {
  initial: { opacity: 0, y: 22, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
} as const;
