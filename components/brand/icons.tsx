import type { SVGProps } from 'react';

/** Hai icon riêng vẽ theo mockup (lucide không có): vợt chéo và sân */
type IconProps = SVGProps<SVGSVGElement> & { strokeWidth?: number };

export function PaddlesIcon({ strokeWidth = 1.9, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <ellipse cx="7.2" cy="7.2" rx="4.4" ry="5.2" transform="rotate(-45 7.2 7.2)" />
      <path d="m10.4 10.4 7.4 7.4" />
      <path d="m17 16.2 2.4 2.4" />
      <ellipse cx="16.8" cy="7.2" rx="4.4" ry="5.2" transform="rotate(45 16.8 7.2)" />
      <path d="m13.6 10.4-7.4 7.4" />
      <path d="m7 16.2-2.4 2.4" />
    </svg>
  );
}

export function CourtIcon({ strokeWidth = 1.9, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" aria-hidden {...props}>
      <rect x="2.5" y="4.5" width="19" height="15" rx="2" />
      <path d="M12 4.5v15M2.5 9h5v6h-5M21.5 9h-5v6h5" />
    </svg>
  );
}

/** Vương miện cho hạng nhất (bảng xếp hạng) */
export function CrownMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 30" className={className} role="img" aria-label="Hạng nhất">
      <path d="M4 26 L8 6 L20 16 L30 2 L40 16 L52 6 L56 26 Z" fill="#FACC15" stroke="#FDE68A" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="8" cy="6" r="3" fill="#FDE68A" />
      <circle cx="30" cy="2.5" r="3" fill="#FDE68A" />
      <circle cx="52" cy="6" r="3" fill="#FDE68A" />
    </svg>
  );
}

/** Vòng nguyệt quế quanh avatar trên bục vinh danh */
export function Laurel({ color }: { color: string }) {
  const leaf = (i: number, side: -1 | 1) => {
    const a = 100 + i * 24;
    const rad = (a * Math.PI) / 180;
    let x = 50 + Math.cos(rad) * 36;
    const y = 54 + Math.sin(rad) * 36;
    if (side > 0) x = 100 - x;
    return (
      <ellipse
        key={`${side}-${i}`}
        cx={x.toFixed(1)}
        cy={y.toFixed(1)}
        rx="3.2"
        ry="8.5"
        fill={color}
        transform={`rotate(${side < 0 ? a : -a} ${x.toFixed(1)} ${y.toFixed(1)})`}
      />
    );
  };
  return (
    <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => leaf(i, -1))}
      {[0, 1, 2, 3, 4, 5].map((i) => leaf(i, 1))}
    </svg>
  );
}
