"use client";
import { useCallback, useRef, useState } from "react";
import type { Course } from "@/lib/calc";
import { MinInput } from "@/components/MinInput";
import { ImageDrop } from "@/components/ImageDrop";
import { ManualForm, isBlank, newRow, rowError, type Row } from "@/components/ManualForm";
import { Report } from "@/components/Report";

const SAMPLE: [number, number][] = [[28, 22], [30, 23], [36, 31], [40, 31], [36, 27], [38, 26], [38, 29]];

function Step({ n, title, aside, children, ref }: { n: string; title: string; aside?: React.ReactNode; children: React.ReactNode; ref?: React.Ref<HTMLElement> }) {
  return (
    <section ref={ref} className="grid scroll-mt-6 gap-6 border-t border-line py-12 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-10 sm:py-16">
      <div>
        <div className="font-mono text-xs text-muted">{n}</div>
        <h2 className="mt-1 font-serif text-3xl text-balance">{title}</h2>
        {aside && <div className="mt-3">{aside}</div>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function Home() {
  const [minText, setMinText] = useState("75");
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  const [showErrors, setShowErrors] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const reportRef = useRef<HTMLElement>(null);

  const min = Number(minText);
  const minError = minText === "" ? "Enter your college's minimum attendance." : !(min > 0 && min <= 100) ? "Enter a number between 1 and 100." : null;

  const courses: Course[] = rows.flatMap((r, i) =>
    isBlank(r) || rowError(r) ? [] : [{ name: r.name.trim() || `Course ${i + 1}`, total: Number(r.total), present: Number(r.present) }],
  );
  const showReport = submitted && !minError && courses.length > 0;

  const scrollToReport = () => setTimeout(() => reportRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const onExtract = useCallback((found: Course[]) => {
    setRows(found.map((c) => newRow({ name: c.name, total: String(c.total), present: String(c.present) })));
    setShowErrors(true);
    setSubmitted(true);
    setFormError(null);
    scrollToReport();
  }, []);

  const submit = () => {
    setShowErrors(true);
    if (minError) return setFormError("Set your minimum attendance first.");
    if (!rows.some((r) => !isBlank(r))) return setFormError("Add at least one subject.");
    if (rows.some(rowError)) return setFormError("Fix the highlighted rows.");
    setFormError(null);
    setSubmitted(true);
    scrollToReport();
  };

  const loadSample = () => {
    setRows(SAMPLE.map(([total, present]) => newRow({ total: String(total), present: String(present) })));
    setFormError(null);
  };

  const startOver = () => {
    setRows([newRow()]);
    setSubmitted(false);
    setShowErrors(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-8">
      <section className="pb-16 pt-16 text-center sm:pb-24 sm:pt-24">
        <h1
          className="font-serif text-[clamp(4.5rem,21vw,13rem)] leading-[0.85]"
          style={{ WebkitTextStroke: "0.03em currentColor" }}
        >
          Bunkmeter
        </h1>
        <p className="mx-auto mt-8 max-w-2xl font-serif text-3xl leading-tight text-balance sm:text-5xl">
          How many classes can you <em className="text-accent">actually</em> skip?
        </p>
        <p className="mx-auto mt-6 max-w-xl text-lg text-pretty text-muted">
          Drop in a screenshot of your attendance sheet, or type it in. Set your college&apos;s minimum and get a straight answer for every subject.
        </p>
      </section>

      <Step n="01" title="Minimum attendance">
        <MinInput value={minText} onChange={setMinText} error={minError} />
      </Step>

      <Step
        n="02"
        title="Your attendance"
        aside={
          <button type="button" onClick={loadSample} className="text-sm text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink">
            Try with sample data
          </button>
        }
      >
        <ImageDrop onResult={onExtract} />

        <div className="my-8 flex items-center gap-4 font-mono text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          OR
          <span className="h-px flex-1 bg-line" />
        </div>

        <ManualForm rows={rows} onChange={setRows} onSubmit={submit} showErrors={showErrors} error={formError} />
      </Step>

      {showReport && (
        <Step
          ref={reportRef}
          n="03"
          title="The verdict"
          aside={
            <button type="button" onClick={startOver} className="text-sm text-muted underline decoration-line underline-offset-4 transition-colors hover:text-ink hover:decoration-ink">
              Start over
            </button>
          }
        >
          <Report courses={courses} min={min} />
        </Step>
      )}

      <footer className="border-t border-line py-8 text-sm text-pretty text-muted">
        “Can skip” assumes you miss every upcoming class of that subject until you hit the minimum. Edit any number above and the verdict updates.
      </footer>
    </div>
  );
}
