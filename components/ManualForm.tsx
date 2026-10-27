"use client";
import { cn } from "@/lib/cn";

export type Row = { id: string; name: string; total: string; present: string };

export const newRow = (fields: Partial<Row> = {}): Row => ({
  id: Math.random().toString(36).slice(2),
  name: "",
  total: "",
  present: "",
  ...fields,
});

export const isBlank = (r: Row) => r.total === "" && r.present === "";

export function rowError(r: Row): string | null {
  if (isBlank(r)) return null;
  if (r.total === "" || Number(r.total) === 0) return "Enter the total classes held.";
  if (r.present === "") return "Enter how many classes you attended.";
  if (Number(r.present) > Number(r.total)) return "Attended can't be more than classes held.";
  return null;
}

const field =
  "h-11 w-full rounded-lg border bg-paper px-3 outline-none transition-colors placeholder:text-muted/60 focus:border-ink focus:placeholder:text-transparent";

type Props = {
  rows: Row[];
  onChange: (rows: Row[]) => void;
  onSubmit: () => void;
  showErrors: boolean;
  error: string | null;
};

export function ManualForm({ rows, onChange, onSubmit, showErrors, error }: Props) {
  const update = (id: string, patch: Partial<Row>) => onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="rounded-2xl border border-line bg-card p-4 sm:p-6"
    >
      <div className="hidden grid-cols-[2rem_minmax(0,1fr)_7.5rem_7.5rem_2.5rem] gap-3 px-0.5 pb-3 text-xs text-muted sm:grid">
        <span>#</span>
        <span>Subject</span>
        <span>Classes held</span>
        <span>Attended</span>
        <span />
      </div>

      <ol className="space-y-4 sm:space-y-3">
        {rows.map((r, i) => {
          const err = showErrors ? rowError(r) : null;
          const bad = cn(err ? "border-short" : "border-line");
          return (
            <li key={r.id}>
              <div className="grid grid-cols-[1fr_1fr_2.5rem] items-center gap-2 sm:grid-cols-[2rem_minmax(0,1fr)_7.5rem_7.5rem_2.5rem] sm:gap-3">
                <span className="hidden font-mono text-sm text-muted tabular-nums sm:block">{String(i + 1).padStart(2, "0")}</span>
                <input
                  value={r.name}
                  onChange={(e) => update(r.id, { name: e.target.value })}
                  placeholder={`Course ${i + 1}`}
                  aria-label={`Subject ${i + 1} name`}
                  className={cn(field, "col-span-2 border-line sm:col-span-1")}
                />
                <button
                  type="button"
                  onClick={() => onChange(rows.length > 1 ? rows.filter((x) => x.id !== r.id) : [newRow()])}
                  aria-label={`Remove subject ${i + 1}`}
                  className="grid size-10 place-items-center justify-self-center rounded-lg text-muted transition-colors hover:bg-paper hover:text-short sm:order-last"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
                <input
                  value={r.total}
                  onChange={(e) => update(r.id, { total: digits(e.target.value) })}
                  inputMode="numeric"
                  placeholder="Held"
                  aria-label={`Subject ${i + 1} classes held`}
                  aria-invalid={!!err}
                  className={cn(field, bad, "font-mono tabular-nums")}
                />
                <input
                  value={r.present}
                  onChange={(e) => update(r.id, { present: digits(e.target.value) })}
                  inputMode="numeric"
                  placeholder="Attended"
                  aria-label={`Subject ${i + 1} classes attended`}
                  aria-invalid={!!err}
                  className={cn(field, bad, "font-mono tabular-nums")}
                />
              </div>
              {err && <p className="mt-1.5 text-xs text-short sm:pl-11">{err}</p>}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={() => onChange([...rows, newRow()])}
        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line text-sm text-muted transition-colors hover:border-ink hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
        Add subject
      </button>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button type="submit" className="h-12 rounded-full bg-ink px-7 font-medium text-paper transition-colors hover:bg-accent">
          Calculate
        </button>
        {error && <p className="text-sm text-short">{error}</p>}
      </div>
    </form>
  );
}
