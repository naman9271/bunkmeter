import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type MediaType = (typeof TYPES)[number];

const PROMPT = `This is a screenshot of an attendance spreadsheet. Each COLUMN (after the label column) is one subject/course.

Extract, for every subject column, ONLY the "Overall" rows:
- "Overall Class"   -> total classes held so far
- "Overall Present" -> classes attended
- "Overall Absent"  -> classes missed
Ignore the per-day rows ("Total Classes", "Total Absent", "Total Present") and the date row.

Subject names: if a header row with real subject names is visible, use them. Otherwise name them "Course 1", "Course 2", ... from left to right.

Reply with JSON only, no prose, no code fences:
{"courses":[{"name":"Course 1","total":28,"present":22,"absent":6}]}`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server." },
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
    const client = new Anthropic();
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: file.type as MediaType, data } },
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
    const courses = (json.courses ?? [])
      .map((c: any, i: number) => {
        const total = Number(c.total);
        const present = Number(c.present ?? total - Number(c.absent));
        return { name: String(c.name || `Course ${i + 1}`), total, present };
      })
      .filter((c: any) => Number.isFinite(c.total) && Number.isFinite(c.present));

    if (!courses.length) throw new Error("No subjects found");
    return NextResponse.json({ courses });
  } catch (e: any) {
    const msg = e?.status === 401 ? "Invalid Anthropic API key." : "Couldn't read attendance from that image. Try a sharper crop.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
