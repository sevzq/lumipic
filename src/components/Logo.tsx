export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#000000" />
      {/* aperture-like L glyph */}
      <path
        d="M12 8.5V19a3 3 0 0 0 3 3h8"
        stroke="#ffffff"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <circle cx="21.5" cy="10.5" r="2.2" fill="#C5B0F4" />
    </svg>
  );
}
