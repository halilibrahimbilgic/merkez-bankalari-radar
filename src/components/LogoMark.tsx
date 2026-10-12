/**
 * Faiz Radar işareti — sade sürüm (tek halka, tarama çizgisi, hedef noktası).
 * Küçük boyutlarda okunsun diye ikinci halka ve tarama dilimi yok; tam sürüm
 * public/brand/faizradar.svg'de. Kendi koyu zeminini taşır, iki temada da
 * aynı görünür. next/og (Satori) da render ettiği için yalnızca düz SVG
 * öğeleri ve satır içi öznitelik kullanır.
 */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="512" height="512" rx="112" fill="#0b0d12" />
      <circle cx="256" cy="256" r="176" fill="none" stroke="#7ea2ff" strokeOpacity="0.8" strokeWidth="34" />
      <line x1="256" y1="256" x2="369.1" y2="121.2" stroke="#7ea2ff" strokeWidth="36" strokeLinecap="round" />
      <circle cx="256" cy="256" r="26" fill="#7ea2ff" />
      <circle cx="270.2" cy="120.7" r="40" fill="#fbbf24" />
    </svg>
  );
}
