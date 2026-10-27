// Pure image + text helpers for reading an attendance table with Tesseract.
// No DOM or Node APIs here, so the browser and the test script share it.

import type { Course } from "./calc";

export type Raster = { data: Uint8ClampedArray; width: number; height: number };
export type OcrWord = { text: string; bbox: { x0: number; y0: number; x1: number; y1: number } };

const TARGET_WIDTH = 3000;

/**
 * Upscales, binarises (Otsu) and erases table grid lines. Tesseract reads
 * small, grey-celled, gridded screenshots badly; this turns them into large
 * black text on white with nothing else around it.
 */
export function preprocess(src: Raster, darkness = 1): Raster {
  const scale = Math.min(4, Math.max(1, TARGET_WIDTH / src.width));
  const W = Math.round(src.width * scale);
  const H = Math.round(src.height * scale);

  // grayscale, alpha composited onto white
  const grey = new Float32Array(src.width * src.height);
  for (let i = 0; i < grey.length; i++) {
    const r = src.data[i * 4], g = src.data[i * 4 + 1], b = src.data[i * 4 + 2], a = src.data[i * 4 + 3] / 255;
    grey[i] = a * (0.299 * r + 0.587 * g + 0.114 * b) + (1 - a) * 255;
  }

  // bilinear upscale
  const up = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const sy = Math.min(Math.max((y + 0.5) / scale - 0.5, 0), src.height - 1);
    const y0 = Math.floor(sy), y1 = Math.min(y0 + 1, src.height - 1), fy = sy - y0;
    for (let x = 0; x < W; x++) {
      const sx = Math.min(Math.max((x + 0.5) / scale - 0.5, 0), src.width - 1);
      const x0 = Math.floor(sx), x1 = Math.min(x0 + 1, src.width - 1), fx = sx - x0;
      const top = grey[y0 * src.width + x0] * (1 - fx) + grey[y0 * src.width + x1] * fx;
      const bot = grey[y1 * src.width + x0] * (1 - fx) + grey[y1 * src.width + x1] * fx;
      up[y * W + x] = top * (1 - fy) + bot * fy;
    }
  }

  // Otsu threshold -> dark mask
  const hist = new Array(256).fill(0);
  for (const v of up) hist[v]++;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, best = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (!wB) continue;
    const wF = up.length - wB;
    if (!wF) break;
    sumB += t * hist[t];
    const diff = sumB / wB - (sum - sumB) / wF;
    const between = wB * wF * diff * diff;
    if (between > best) { best = between; threshold = t; }
  }
  // darkness < 1 keeps only the inkiest pixels: thins upscaled low-res text
  // that would otherwise bleed into blobs, and drops faint grid lines.
  const cut = threshold * darkness;
  const dark = new Uint8Array(W * H);
  for (let i = 0; i < dark.length; i++) dark[i] = up[i] <= cut ? 1 : 0;

  // Grid lines are dark runs far longer than any glyph stroke. Detect on the
  // untouched mask in both directions (bridging small gaps, since thin lines
  // come out dashed after scaling), then erase.
  const minRun = Math.max(80, Math.round(0.05 * Math.max(W, H)));
  const gap = Math.ceil(scale * 2);
  const erase = new Uint8Array(W * H);
  const scan = (len: number, lines: number, at: (line: number, i: number) => number) => {
    for (let l = 0; l < lines; l++) {
      let start = -1, lastOn = -1;
      for (let i = 0; i <= len; i++) {
        const on = i < len && dark[at(l, i)];
        if (on) {
          if (start < 0) start = i;
          lastOn = i;
        } else if (start >= 0 && (i === len || i - lastOn > gap)) {
          if (lastOn - start + 1 >= minRun) for (let k = start; k <= lastOn; k++) erase[at(l, k)] = 1;
          start = -1;
        }
      }
    }
  };
  scan(W, H, (y, x) => y * W + x);
  scan(H, W, (x, y) => y * W + x);

  const out = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < dark.length; i++) {
    const v = dark[i] && !erase[i] ? 0 : 255;
    out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v;
    out[i * 4 + 3] = 255;
  }
  return { data: out, width: W, height: H };
}

type Kind = "total" | "absent" | "present" | "pct" | null;
type Cell = { n: number; pct: boolean; x: number };
type Line = { y: number; cells: Cell[]; label: string; kind: Kind; overall: boolean };
type Pick = { score: number; courses: { total: number; present: number; at: number }[]; top: number };

const yc = (w: OcrWord) => (w.bbox.y0 + w.bbox.y1) / 2;
const xc = (w: OcrWord) => (w.bbox.x0 + w.bbox.x1) / 2;
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const sum = (xs: number[]) => xs.reduce((s, v) => s + v, 0);
const transpose = (w: OcrWord): OcrWord => ({ text: w.text, bbox: { x0: w.bbox.y0, y0: w.bbox.x0, x1: w.bbox.y1, y1: w.bbox.x1 } });

function classify(words: OcrWord[]) {
  const nums: (OcrWord & { n: number; pct: boolean })[] = [];
  const alpha: OcrWord[] = [];
  for (const w of words) {
    const t = w.text.trim().replace(/^[^\w(]+|[^\w%)]+$/g, "");
    const pct = t.match(/^\(?(\d{1,3}(?:[.,]\d{1,2})?)\s*%\)?$/) ?? t.match(/^(\d{1,3}[.,]\d{1,2})$/);
    if (pct) nums.push({ ...w, n: Number(pct[1].replace(",", ".")), pct: true });
    else if (/^\d{1,4}$/.test(t)) nums.push({ ...w, n: Number(t), pct: false });
    else if (/[a-z]{2,}/i.test(t)) alpha.push(w);
  }
  return { nums, alpha };
}

/**
 * Reads a table where each subject is a COLUMN and the metrics are rows
 * (held / absent / present / %). The other layout is handled by transposing
 * the word boxes first. A candidate only counts if it passes a self-check:
 * held = absent + present, or present / held matches a % row. If OCR misreads
 * a digit the check fails and we return nothing rather than a wrong answer.
 */
function parseOriented(words: OcrWord[]): Pick | null {
  const { nums, alpha } = classify(words);
  const ints = nums.filter((w) => !w.pct);
  if (ints.length < 2) return null;

  // cluster numbers into lines by their centre across the line
  const hMed = median(ints.map((w) => w.bbox.y1 - w.bbox.y0));
  const lines: Line[] = [];
  for (const w of [...nums].sort((a, b) => yc(a) - yc(b))) {
    const line = lines.find((l) => Math.abs(l.y - yc(w)) <= hMed * 0.6);
    const cell = { n: w.n, pct: w.pct, x: xc(w) };
    if (line) {
      line.cells.push(cell);
      line.y = (line.y * (line.cells.length - 1) + yc(w)) / line.cells.length;
    } else lines.push({ y: yc(w), cells: [cell], label: "", kind: null, overall: false });
  }
  lines.forEach((l) => l.cells.sort((a, b) => a.x - b.x));

  // labels sit before the first number; they may wrap onto two lines
  for (const w of alpha) {
    let best: Line | null = null;
    let bestD = hMed * 1.6;
    for (const l of lines) {
      const d = Math.abs(l.y - yc(w));
      if (w.bbox.x1 < l.cells[0].x && d < bestD) { bestD = d; best = l; }
    }
    if (best) best.label += " " + w.text.toLowerCase();
  }
  for (const l of lines) {
    l.overall = /overall|cumul|net\b|grand/.test(l.label);
    l.kind = /abs|miss|leave/.test(l.label) ? "absent"
      : /pres|attend/.test(l.label) ? "present"
      : /%|perc/.test(l.label) || l.cells.every((c) => c.pct) ? "pct"
      : /class|total|held|deliver|conduct|lecture/.test(l.label) ? "total"
      : null;
  }

  const intLines = lines.filter((l) => l.cells.every((c) => !c.pct) && l.cells.length >= 1);
  const pctLines = lines.filter((l) => l.cells.some((c) => c.pct) || l.kind === "pct");
  const aligned = (a: Line, b: Line) => {
    if (a.cells.length !== b.cells.length) return false;
    const gaps = a.cells.slice(1).map((c, i) => c.x - a.cells[i].x);
    const tol = gaps.length ? Math.min(...gaps) * 0.45 : Infinity;
    return a.cells.every((c, i) => Math.abs(c.x - b.cells[i].x) < tol);
  };
  const labelScore = (t: Line, p: Line) => (t.kind === "total" ? 4 : 0) + (p.kind === "present" ? 4 : 0);

  let best: Pick | null = null;
  const consider = (score: number, t: Line, p: Line) => {
    score += Math.min(t.y, p.y) / 1e6; // tie-break: lower in the sheet = cumulative totals
    if (!best || score > best.score)
      best = { score, top: Math.min(...lines.map((l) => l.y - hMed)), courses: t.cells.map((c, i) => ({ total: c.n, present: p.cells[i].n, at: c.x })) };
  };

  for (const t of intLines)
    for (const p of intLines) {
      if (t === p || !aligned(t, p)) continue;
      if (!t.cells.every((c, i) => c.n > 0 && p.cells[i].n <= c.n)) continue;

      // check 1: an absent line with held = absent + present
      for (const a of intLines) {
        if (a === t || a === p || !aligned(t, a)) continue;
        if (!t.cells.every((c, i) => c.n === a.cells[i].n + p.cells[i].n)) continue;
        let s = 10 + labelScore(t, p) + (a.kind === "absent" ? 4 : 0);
        if (t.overall && a.overall && p.overall) s += 3;
        if (a.kind === null && p.kind === null && sum(p.cells.map((c) => c.n)) >= sum(a.cells.map((c) => c.n))) s += 1;
        consider(s, t, p);
      }

      // check 2: a % line with present / held matching it
      for (const q of pctLines) {
        if (!aligned(t, q)) continue;
        if (!t.cells.every((c, i) => Math.abs((p.cells[i].n / c.n) * 100 - q.cells[i].n) <= 0.6)) continue;
        consider(10 + labelScore(t, p) + (t.overall && p.overall ? 3 : 0), t, p);
      }
    }
  return best;
}

/** Subject names: text lined up with each subject, before the first number line. */
function namesFor(words: OcrWord[], pick: Pick): string[] {
  const { alpha } = classify(words);
  const gaps = pick.courses.slice(1).map((c, i) => c.at - pick.courses[i].at);
  const tol = gaps.length ? Math.min(...gaps) * 0.45 : Infinity;
  return pick.courses.map((c, i) => {
    const name = alpha
      .filter((w) => w.bbox.y1 <= pick.top && Math.abs(xc(w) - c.at) < tol)
      .sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
      .map((w) => w.text)
      .join(" ")
      .replace(/[^\w&().\- ]/g, "")
      .trim();
    return name.length >= 2 ? name : `Course ${i + 1}`;
  });
}

export function parseAttendance(words: OcrWord[]): Course[] | null {
  const flipped = words.map(transpose);
  const cols = parseOriented(words); // subjects as columns
  const rows = parseOriented(flipped); // subjects as rows
  const [pick, space] = !rows || (cols && cols.score >= rows.score) ? [cols, words] : [rows, flipped];
  if (!pick) return null;
  const names = namesFor(space, pick);
  return pick.courses.map((c, i) => ({ name: names[i], total: c.total, present: c.present }));
}
