"use client";
import { motion } from "framer-motion";

export function Ring({ pct, min, color, size = 112 }: { pct: number; min: number; color: string; size?: number }) {
  const r = (size - 14) / 2;
  const c = 2 * Math.PI * r;
  const clamp = (n: number) => Math.min(Math.max(n, 0), 100);
  const angle = (clamp(min) / 100) * 360 - 90;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth={9} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={9} strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamp(pct) / 100) }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color})` }}
        />
      </svg>
      {/* minimum-attendance tick */}
      <div className="absolute inset-0" style={{ transform: `rotate(${angle + 90}deg)` }}>
        <div className="mx-auto h-[14px] w-[2px] rounded bg-white/70" />
      </div>
      <div className="absolute inset-0 grid place-items-center text-xl font-bold tabular-nums">
        {pct.toFixed(1)}<span className="text-xs opacity-60">%</span>
      </div>
    </div>
  );
}
