/** Logo bóng pickleball + chữ "Dalton Pickleball" */
export function LogoBall({ className = 'size-10' }: { className?: string }) {
  const holes: [number, number][] = [[24, 10], [13, 15], [35, 15], [24, 21], [10, 26], [38, 26], [17, 31], [31, 31], [24, 38]];
  return (
    <svg viewBox="0 0 48 48" className={`${className} shrink-0 drop-shadow-[0_0_14px_rgba(215,245,49,.35)]`} aria-hidden>
      <defs>
        <radialGradient id="logo-ball" cx=".35" cy=".3" r=".75">
          <stop offset="0" stopColor="#F4FF8A" />
          <stop offset=".6" stopColor="#D7F531" />
          <stop offset="1" stopColor="#9DBB14" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#logo-ball)" />
      <g fill="#0B1424">
        {holes.map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" />
        ))}
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoBall />
      <div className="shrink-0 text-[17px] font-extrabold leading-[.95] tracking-tight">
        <div>Dalton</div>
        <div className="text-lime">Pickleball</div>
      </div>
    </div>
  );
}
