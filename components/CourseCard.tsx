"use client";
import { motion } from "framer-motion";
import { Analysis, Course } from "@/lib/calc";
import { Ring } from "./Ring";

const THEME = {
  safe: { color: "#34f5c5", label: "Chill zone", emoji: "😎" },
  edge: { color: "#ffc857", label: "On the edge", emoji: "😬" },
  danger: { color: "#ff4d8d", label: "Danger zone", emoji: "🚨" },
} as const;

export function CourseCard({
  course, a, min, index, onChange,
}: { course: Course; a: Analysis; min: number; index: number; onChange: (c: Course) => void }) {
  const t = THEME[a.status];
  const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: "spring", stiffness: 120, damping: 18 }}
      whileHover={{ y: -4 }}
      className="glass relative overflow-hidden rounded-3xl p-5"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-25 blur-3xl" style={{ background: t.color }} />

      <div className="flex items-center justify-between gap-2">
        <input
          value={course.name}
          onChange={(e) => onChange({ ...course, name: e.target.value })}
          className="w-full min-w-0 bg-transparent text-lg font-semibold outline-none"
          aria-label="Course name"
        />
        <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: `${t.color}22`, color: t.color }}>
          {t.emoji} {t.label}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <Ring pct={a.pct} min={min} color={t.color} />
        <div className="grid flex-1 grid-cols-3 gap-2 text-center text-xs">
          {[
            ["Held", course.total, (v: number) => onChange({ ...course, total: v })],
            ["Present", course.present, (v: number) => onChange({ ...course, present: v })],
          ].map(([label, val, set]: any) => (
            <label key={label} className="rounded-xl bg-white/5 p-2">
              <input className="num-input text-base font-semibold tabular-nums" inputMode="numeric" value={val} onChange={(e) => set(num(e.target.value))} />
              <div className="mt-1 opacity-50">{label}</div>
            </label>
          ))}
          <div className="rounded-xl bg-white/5 p-2">
            <div className="text-base font-semibold tabular-nums">{a.absent}</div>
            <div className="mt-1 opacity-50">Absent</div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-2xl p-4 text-center" style={{ background: `${t.color}14`, border: `1px solid ${t.color}33` }}>
        {a.status === "danger" ? (
          <>
            <div className="text-xs uppercase tracking-widest opacity-60">Attend next</div>
            <div className="text-4xl font-black tabular-nums" style={{ color: t.color }}>
              {Number.isFinite(a.mustAttend) ? a.mustAttend : "∞"}
            </div>
            <div className="text-xs opacity-60">classes in a row to reach {min}%</div>
          </>
        ) : (
          <>
            <div className="text-xs uppercase tracking-widest opacity-60">You can skip</div>
            <div className="text-4xl font-black tabular-nums" style={{ color: t.color }}>{a.canSkip}</div>
            <div className="text-xs opacity-60">more {a.canSkip === 1 ? "class" : "classes"} and still stay ≥ {min}%</div>
          </>
        )}
      </div>
    </motion.div>
  );
}
