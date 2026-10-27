export type Course = { name: string; total: number; present: number };

export type Status = "safe" | "edge" | "short";

export type Analysis = {
  absent: number;
  pct: number;
  status: Status;
  /** classes that can still be skipped while staying >= min (0 if below) */
  canSkip: number;
  /** consecutive classes that must be attended to climb back to min (0 if fine) */
  mustAttend: number;
  /** attendance % after skipping canSkip, or after attending mustAttend */
  projected: number;
};

const EPS = 1e-9;

export function analyze(c: Course, minPct: number): Analysis {
  const { total, present } = c;
  const m = minPct / 100;
  const pct = total > 0 ? (present / total) * 100 : 0;
  const absent = Math.max(total - present, 0);

  if (pct + EPS >= minPct) {
    const canSkip = m > 0 ? Math.max(Math.floor(present / m - total + EPS), 0) : 999;
    const projected = (present / (total + canSkip)) * 100;
    return { absent, pct, canSkip, mustAttend: 0, projected, status: canSkip <= 1 ? "edge" : "safe" };
  }
  const mustAttend = m >= 1 ? Infinity : Math.ceil((m * total - present) / (1 - m) - EPS);
  const projected = Number.isFinite(mustAttend) ? ((present + mustAttend) / (total + mustAttend)) * 100 : 0;
  return { absent, pct, canSkip: 0, mustAttend, projected, status: "short" };
}
