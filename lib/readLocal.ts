import type { Course } from "./calc";
import { parseAttendance, preprocess, type OcrWord, type Raster } from "./ocr";

// Cutoffs tried in turn; lower keeps only the darkest ink (helps blurry / small images).
const LEVELS = [1, 0.7, 0.5];

async function toRaster(file: Blob): Promise<Raster | null> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return null;
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return { data, width, height };
}

/**
 * Reads the sheet entirely in the browser with Tesseract (no key, no quota).
 * Returns null unless the numbers pass the arithmetic self-check in lib/ocr.ts,
 * so the caller can fall back to the AI model for layouts it can't handle.
 */
export async function readLocally(file: Blob): Promise<Course[] | null> {
  try {
    const raster = await toRaster(file);
    if (!raster) return null;
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    try {
      await worker.setParameters({ tessedit_pageseg_mode: "6" as any, user_defined_dpi: "300" });
      for (const level of LEVELS) {
        const pre = preprocess(raster, level);
        const canvas = document.createElement("canvas");
        canvas.width = pre.width;
        canvas.height = pre.height;
        canvas.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(pre.data), pre.width, pre.height), 0, 0);
        const { data } = await worker.recognize(canvas, {}, { blocks: true });
        const words: OcrWord[] = (data.blocks ?? []).flatMap((b) => b.paragraphs.flatMap((p) => p.lines.flatMap((l) => l.words)));
        const courses = parseAttendance(words);
        if (courses) return courses;
      }
      return null;
    } finally {
      await worker.terminate();
    }
  } catch {
    return null;
  }
}
