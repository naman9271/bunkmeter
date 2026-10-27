"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { prepareImage } from "@/lib/image";
import { readLocally } from "@/lib/readLocal";
import type { Course } from "@/lib/calc";

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-xs text-ink">{children}</kbd>;
}

export function ImageDrop({ onResult }: { onResult: (courses: Course[]) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<"local" | "ai">("local");
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const read = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) return setError("That file isn't an image.");
      setError(null);
      setBusy(true);
      setPreview((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(file);
      });
      try {
        // 1) Tesseract in the browser: free, instant, self-checked.
        setStage("local");
        const local = await readLocally(file);
        if (local) return onResult(local);

        // 2) Any other layout: ask the vision model on the server.
        setStage("ai");
        const body = new FormData();
        body.append("image", await prepareImage(file), file.name || "sheet");
        const res = await fetch("/api/extract", { method: "POST", body });
        const json = await res.json().catch(() => ({ error: "The server returned an unexpected response." }));
        if (!res.ok) throw new Error(json.error);
        onResult(json.courses);
      } catch (e: any) {
        setError(e.message || "Something went wrong.");
      } finally {
        setBusy(false);
      }
    },
    [onResult],
  );

  // Ctrl+V anywhere on the page. Only intercepts pastes that contain an image,
  // so pasting text into inputs keeps working.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = Array.from(e.clipboardData?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (!file || busy) return;
      e.preventDefault();
      read(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [read, busy]);

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) read(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !busy) read(f);
        }}
        className={cn(
          "relative flex w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-card px-6 text-center transition-colors",
          preview ? "py-6" : "py-14",
          drag ? "border-accent bg-accent/5" : "border-line hover:border-ink",
          busy && "cursor-progress",
        )}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Your uploaded attendance sheet" className={cn("max-h-56 rounded-lg border border-line object-contain", busy && "opacity-60")} />
            {!busy && <span className="mt-4 text-sm text-muted">Drop, paste or click to replace</span>}
          </>
        ) : (
          <>
            <span className="grid size-12 place-items-center rounded-full border border-line text-ink">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
              </svg>
            </span>
            <span className="mt-5 font-serif text-3xl text-balance">Drop your attendance screenshot</span>
            <span className="mt-2 text-sm text-pretty text-muted">
              Click to upload, or paste with <Kbd>Ctrl</Kbd> + <Kbd>V</Kbd>
            </span>
          </>
        )}

        {busy && (
          <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-line" aria-hidden>
            <span className="block h-full w-2/5 bg-accent motion-safe:animate-[indeterminate_1.1s_ease-in-out_infinite]" />
          </span>
        )}
      </button>

      <p aria-live="polite" className={cn("mt-3 text-sm text-pretty", error ? "text-short" : "text-muted")}>
        {busy
          ? stage === "local"
            ? "Reading your sheet…"
            : "Tricky layout, asking the AI to read it…"
          : error
            ? error
            : preview
              ? "Done. The numbers are filled in below. Fix anything that looks off."
              : "PNG, JPG or WEBP. Columns without subject names become Course 1, Course 2, and so on."}
      </p>
    </div>
  );
}
