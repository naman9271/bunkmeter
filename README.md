# BunkMeter

Upload a screenshot of your attendance sheet, set your minimum attendance %, and see how many classes you can skip per subject (or how many you must attend to recover).

## Setup
1. `npm install`
2. Create a `.env` file (see `.env.local.example`) with a key:
   - **Free:** `GEMINI_API_KEY` from https://aistudio.google.com/apikey
   - Paid alternative: `ANTHROPIC_API_KEY`
3. `npm run dev` → http://localhost:3000

No key? You can still type your numbers in manually.

## How images are read
1. **Tesseract (in the browser):** free, no key, no quota. Used first, and only trusted if the numbers pass a check (held = absent + present, or present ÷ held matches the % row). Handles subjects-as-columns and subjects-as-rows tables.
2. **Gemini (server):** used when Tesseract can't confidently read the layout (photos, app screenshots, unusual designs).
3. **Manual entry:** always available.

## Models
With `GEMINI_API_KEY`, the server tries `gemini-flash-lite-latest`, then `gemini-flash-latest`, then `gemini-3.8-flash`, moving on when one is busy, rate-limited, retired or times out. Set `GEMINI_MODEL` to force a single model.

## Math
- Can skip: `floor(present / min − total)`
- Must attend (when below min): `ceil((min·total − present) / (1 − min))`

## Layout
- `app/api/extract/route.ts`: image → JSON via Gemini or Claude
- `lib/calc.ts`: attendance maths
- `components/`: minimum input, image drop/paste, manual form, report
