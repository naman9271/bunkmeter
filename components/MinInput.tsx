"use client";
import { cn } from "@/lib/cn";

const PRESETS = ["60", "65", "75"];

export function MinInput({ value, onChange, error }: { value: string; onChange: (v: string) => void; error: string | null }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <label
          className={cn(
            "flex h-20 items-center rounded-2xl border bg-card pl-5 pr-4 transition-colors focus-within:border-ink",
            error ? "border-short" : "border-line",
          )}
        >
          <span className="sr-only">Minimum attendance percentage</span>
          <input
            inputMode="decimal"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, "").slice(0, 5))}
            onFocus={(e) => e.target.select()}
            placeholder="75"
            className="w-[3.2ch] bg-transparent font-serif text-6xl leading-none tabular-nums outline-none placeholder:text-line"
          />
          <span className="font-serif text-4xl text-muted">%</span>
        </label>

        <div className="flex items-center gap-2" role="group" aria-label="Common minimums">
          <span className="mr-1 text-sm text-muted">Common</span>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-pressed={value === p}
              className={cn(
                "h-10 rounded-full border px-4 font-mono text-sm tabular-nums transition-colors",
                value === p ? "border-ink bg-ink text-paper" : "border-line text-muted hover:border-ink hover:text-ink",
              )}
            >
              {p}%
            </button>
          ))}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-short">{error}</p>}
    </div>
  );
}
