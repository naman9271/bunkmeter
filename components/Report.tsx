"use client";
import { motion } from "motion/react";
import { analyze, type Analysis, type Course, type Status } from "@/lib/calc";
import { cn } from "@/lib/cn";

const STATUS: Record<Status, { label: (min: number) => string; text: string; bg: string }> = {
  safe: { label: () => "Comfortable", text: "text-safe", bg: "bg-safe" },
  edge: { label: () => "Borderline", text: "text-edge", bg: "bg-edge" },
  short: { label: (min) => `Below ${min}%`, text: "text-short", bg: "bg-short" },
};

const fmt = (n: number) => `${n.toFixed(1)}%`;

function Verdict({ a, min }: { a: Analysis; min: number }) {
  if (a.status === "short") {
    const finite = Number.isFinite(a.mustAttend);
    return (
      <>
        <div className="font-serif text-5xl leading-none text-short tabular-nums">{finite ? a.mustAttend : "∞"}</div>
        <div className="mt-2 text-sm">must attend in a row</div>
        <div className="mt-0.5 font-mono text-xs text-muted">{finite ? `→ back to ${fmt(a.projected)}` : `can't reach ${min}%`}</div>
      </>
    );
  }
  return (
    <>
      <div className="font-serif text-5xl leading-none tabular-nums">{a.canSkip}</div>
      <div className="mt-2 text-sm">{a.canSkip === 1 ? "class you can skip" : "classes you can skip"}</div>
      <div className="mt-0.5 font-mono text-xs text-muted">{a.canSkip ? `→ lands at ${fmt(a.projected)}` : "don't miss the next one"}</div>
    </>
  );
}

export function Report({ courses, min }: { courses: Course[]; min: number }) {
  const results = courses.map((c) => analyze(c, min));
  const totalSkips = results.reduce((s, r) => s + r.canSkip, 0);
  const short = results.filter((r) => r.status === "short").length;
  const held = courses.reduce((s, c) => s + c.total, 0);
  const attended = courses.reduce((s, c) => s + c.present, 0);

  const stats = [
    { label: "Classes you can skip", value: String(totalSkips) },
    { label: `Subjects below ${min}%`, value: String(short), tone: short ? "text-short" : "" },
    { label: "Overall attendance", value: fmt(held ? (attended / held) * 100 : 0) },
  ];

  return (
    <div>
      <dl className="grid grid-cols-3 divide-x divide-line border-y border-line">
        {stats.map((s) => (
          <div key={s.label} className="px-3 py-5 first:pl-0 sm:px-6">
            <dt className="text-xs text-pretty text-muted sm:text-sm">{s.label}</dt>
            <dd className={cn("mt-2 font-serif text-4xl leading-none tabular-nums sm:text-5xl", s.tone)}>{s.value}</dd>
          </div>
        ))}
      </dl>

      <ol className="grid sm:grid-cols-2 sm:gap-x-10">
        {courses.map((c, i) => {
          const a = results[i];
          const st = STATUS[a.status];
          return (
            <motion.li
              key={`${c.name}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: Math.min(i * 0.03, 0.3) }}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 border-b border-line py-6"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="truncate text-lg font-medium">{c.name}</h3>
                  <span className={cn("inline-flex items-center gap-1.5 text-xs", st.text)}>
                    <span className={cn("size-1.5 rounded-full", st.bg)} aria-hidden />
                    {st.label(min)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between font-mono text-xs text-muted tabular-nums">
                  <span>
                    {c.present}/{c.total} attended · {a.absent} missed
                  </span>
                  <span className="text-ink">{fmt(a.pct)}</span>
                </div>
                <div className="relative mt-3 h-1.5 rounded-full bg-line" role="img" aria-label={`${fmt(a.pct)} attendance against a ${min}% minimum`}>
                  <div className={cn("h-full rounded-full", st.bg)} style={{ width: `${Math.min(a.pct, 100)}%` }} />
                  <div className="absolute -top-1 h-3.5 w-0.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: `${Math.min(min, 100)}%` }} />
                </div>
              </div>

              <div className="text-right">
                <Verdict a={a} min={min} />
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
