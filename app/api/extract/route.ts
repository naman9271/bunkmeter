import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const CLAUDE_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
// Tried in order. The *-latest aliases follow Google's current models, so they
// survive model retirements; a busy or missing model falls through to the next.
const GEMINI_MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-3.8-flash"];
const RETRYABLE = new Set([404, 429, 500, 503]);

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type MediaType = (typeof TYPES)[number];

const PROMPT = `This is a screenshot of an attendance spreadsheet. Each COLUMN (after the label column) is one subject/course.

Extract, for every subject column, ONLY the "Overall" rows:
- "Overall Class"   -> total classes held so far
- "Overall Present" -> classes attended
- "Overall Absent"  -> classes missed
Ignore the per-day rows ("Total Classes", "Total Absent", "Total Present") and the date row.
If there are no "Overall" rows, use whatever rows give total classes held and classes attended.

Subject names: if a header row with real subject names or codes is visible, use them. Otherwise name them "Course 1", "Course 2", ... from left to right.

Reply with JSON only, no prose, no code fences:
{"courses":[{"name":"Course 1","total":28,"present":22,"absent":6}]}`;

class ProviderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function readWithGemini(mime: string, data: string): Promise<string> {
  let last: ProviderError | null = null;
  for (const model of GEMINI_MODELS) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mime, data } }, { text: PROMPT }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0 },
      }),
      // An overloaded model can hang instead of returning 503; move on to the next one.
      signal: AbortSignal.timeout(25_000),
    }).catch((e) => {
      console.error(`[extract] ${model} -> ${e.name}`);
      return null;
    });
    if (!res) {
      last = new ProviderError(503, "timeout");
      continue;
    }
    if (res.ok) {
      const json = await res.json();
      const parts: any[] = json.candidates?.[0]?.content?.parts ?? [];
      return parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("");
    }
    const detail = await res.text();
    console.error(`[extract] ${model} -> ${res.status}: ${detail.slice(0, 300)}`);
    last = new ProviderError(res.status, detail);
    if (!RETRYABLE.has(res.status)) break;
  }
  throw last;
}

async function readWithClaude(mime: MediaType, data: string): Promise<string> {
  const client = new Anthropic();
  const res = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mime, data } },
          { type: "text", text: PROMPT },
        ],
      },
    ],
  });
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

function errorMessage(status?: number) {
  if (status === 400 || status === 401 || status === 403) return "The API key was rejected. Check GEMINI_API_KEY in your .env file.";
  if (status === 429 || status === 503) return "The free AI models are busy right now. Try again in a minute, or type your numbers in below.";
  return "Couldn't read attendance from that image. Try a sharper crop, or type your numbers in below.";
}

export async function POST(req: Request) {
  const useGemini = !!process.env.GEMINI_API_KEY;
  if (!useGemini && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "No API key set. Add GEMINI_API_KEY (free) to .env and restart the dev server." },
      { status: 500 },
    );
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image uploaded." }, { status: 400 });
  }
  if (!TYPES.includes(file.type as MediaType)) {
    return NextResponse.json({ error: "Use a PNG, JPG, WEBP or GIF image." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image is over 5MB." }, { status: 400 });
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const text = useGemini ? await readWithGemini(file.type, data) : await readWithClaude(file.type as MediaType, data);
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const courses = (json.courses ?? [])
      .map((c: any, i: number) => {
        const total = Number(c.total);
        const present = c.present != null ? Number(c.present) : total - Number(c.absent);
        return { name: String(c.name || `Course ${i + 1}`).trim(), total, present };
      })
      .filter((c: any) => Number.isFinite(c.total) && Number.isFinite(c.present) && c.total > 0);

    if (!courses.length) throw new Error("No subjects found");
    return NextResponse.json({ courses });
  } catch (e: any) {
    if (!(e instanceof ProviderError)) console.error("[extract]", e);
    const status = e instanceof ProviderError ? e.status : e?.status;
    return NextResponse.json({ error: errorMessage(status) }, { status: status === 429 || status === 503 ? 503 : 502 });
  }
}
