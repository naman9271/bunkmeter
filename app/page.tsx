"use client";
import { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { analyze, Course } from "@/lib/calc";
import { CourseCard } from "@/components/CourseCard";

const DEMO: Course[] = [
  [28, 22], [30, 23], [36, 31], [40, 31], [36, 27], [38, 26], [38, 29],
].map(([total, present], i) => ({ name: `Course ${i + 1}`, total, present }));

export default function Home() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [min, setMin] = useState(75);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    setError(null);
    setCourses(null);
    setPreview(URL.createObjectURL(file));
    setScanning(true);
    try {
      const body = new FormData();
      body.append("image", file);
      const res = await fetch("/api/extract", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Something went wrong.");
      setCourses(json.courses);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  }, []);

  const results = useMemo(() => courses?.map((c) => analyze(c, min)), [courses, min]);
  const totalSkips = results?.reduce((s, r) => s + r.canSkip, 0) ?? 0;
  const risky = results?.filter((r) => r.status === "danger").length ?? 0;
  const best = results && courses ? courses[results.reduce((bi, r, i, a) => (r.canSkip > a[bi].canSkip ? i : bi), 0)] : null;

  const reset = () => { setCourses(null); setPreview(null); setError(null); };

  return (
    <main className="mx-auto max-w-6xl px-5 py-14">
      <motion.header initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <span className="glass inline-block rounded-full px-4 py-1.5 text-xs tracking-widest text-white/70">✦ AI ATTENDANCE DECODER</span>
        <h1 className="mt-5 text-5xl font-black tracking-tight sm:text-7xl">
          Bunk<span className="grad-text">Meter</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          Drop a screenshot of your attendance sheet. We read every subject and tell you exactly how many classes you can skip.
        </p>
      </motion.header>

      {/* minimum slider */}
      <div className="glass mx-auto mt-10 flex max-w-xl items-center gap-5 rounded-2xl px-6 py-4">
        <div className="text-sm text-white/60">Minimum<br />attendance</div>
        <input type="range" min={30} max={100} value={min} onChange={(e) => setMin(+e.target.value)} className="flex-1" aria-label="Minimum attendance percentage" />
        <div className="grad-text w-16 text-right text-3xl font-black tabular-nums">{min}%</div>
      </div>

      {/* dropzone */}
      {!courses && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
          onClick={() => !scanning && inputRef.current?.click()}
          className={`glass relative mx-auto mt-8 max-w-3xl cursor-pointer overflow-hidden rounded-3xl border-dashed p-10 text-center transition ${drag ? "scale-[1.02] !border-[#34f5c5]" : ""}`}
          style={{ borderStyle: "dashed", borderWidth: 2 }}
        >
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          {preview ? (
            <div className="relative overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Uploaded attendance" className="w-full opacity-80" />
              {scanning && <div className="scanline" />}
            </div>
          ) : (
            <>
              <div className="text-6xl">📸</div>
              <div className="mt-4 text-xl font-semibold">Drop your attendance screenshot here</div>
              <div className="mt-1 text-sm text-white/50">or click to browse · PNG, JPG, WEBP · up to 5MB</div>
            </>
          )}
          {scanning && <div className="mt-4 animate-pulse text-sm text-[#34f5c5]">Claude is reading your sheet…</div>}
        </motion.div>
      )}

      {!courses && !scanning && (
        <div className="mt-4 text-center">
          <button onClick={() => setCourses(DEMO)} className="text-sm text-white/50 underline-offset-4 hover:text-white hover:underline">
            or try it with sample data
          </button>
        </div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alert"
            className="mx-auto mt-6 max-w-xl rounded-xl border border-[#ff4d8d]/40 bg-[#ff4d8d]/10 p-4 text-center text-sm text-[#ff9fc0]">
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* results */}
      {courses && results && (
        <section className="mt-12">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Total skippable classes", totalSkips, "#34f5c5"],
              ["Subjects at risk", risky, risky ? "#ff4d8d" : "#34f5c5"],
              ["Safest subject", best && totalSkips ? best.name : "—", "#7c8cff"],
            ].map(([l, v, c], i) => (
              <motion.div key={l as string} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="glass rounded-2xl p-5 text-center">
                <div className="text-xs uppercase tracking-widest text-white/50">{l}</div>
                <div className="mt-1 truncate text-4xl font-black tabular-nums" style={{ color: c as string }}>{v}</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {courses.map((c, i) => (
              <CourseCard key={i} index={i} course={c} a={results[i]} min={min}
                onChange={(n) => setCourses(courses.map((x, j) => (j === i ? n : x)))} />
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-white/40">
            Numbers are editable — fix anything the AI misread. “Skip” counts assume you attend none of the upcoming classes of that subject.
          </p>
          <div className="mt-6 text-center">
            <button onClick={reset} className="glass rounded-full px-6 py-2.5 text-sm font-semibold transition hover:scale-105">
              ↻ Upload another sheet
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
