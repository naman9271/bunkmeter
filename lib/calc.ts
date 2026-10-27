export type Course = { name: string; total: number; present: number };

export type Status = "safe" | "edge" | "danger";

export type Analysis = {
  absent: number;
  pct: number;
  status: Status;
  /** classes that can still be skipped while staying >= min (0 if below) */
  canSkip: number;
  /** consecutive classes that must be attended to climb back to min (0 if fine) */
  mustAttend: number;
};

const EPS = 1e-9;

export function analyze(c: Course, minPct: number): Analysis {
  const { total, present } = c;
  const m = minPct / 100;
  const pct = total > 0 ? (present / total) * 100 : 0;
  const absent = Math.max(total - present, 0);

  if (pct + EPS >= minPct) {
    const canSkip = m > 0 ? Math.max(Math.floor(present / m - total + EPS), 0) : 999;
    return { absent, pct, canSkip, mustAttend: 0, status: canSkip <= 1 ? "edge" : "safe" };
  }
  const mustAttend = m >= 1 ? Infinity : Math.ceil((m * total - present) / (1 - m) - EPS);
  return { absent, pct, canSkip: 0, mustAttend, status: "danger" };
}
