import sharp from "sharp";
import { openai, OPENAI_VISION_MODEL } from "./openai.js";

// Resize before encoding so we don't ship 10 MB of bytes for a fabric photo.
// 768px is enough to read embroidery detail; the model doesn't see pixels
// past its own visual encoder anyway.
const ANALYZE_SIZE = 768;
const ANALYZE_QUALITY = 82;

const SYSTEM_PROMPT = `You analyze fashion design reference images for the AI Fashion Designer feature.
The user has uploaded a CLOSE-UP image of one part of an outfit (e.g. a neckline, sleeve, daman/border, dupatta, embroidery, or fabric swatch).

Your job is to describe what you see in a way that a downstream image-generation model can use to reproduce this design element on a new mannequin outfit.

Return ONLY valid JSON matching this exact schema — no prose, no markdown, no code fences:

{
  "dominantColors": ["#RRGGBB", "#RRGGBB", "#RRGGBB"],
  "embroideryType": "string|null",
  "stitchingDensity": "light|medium|heavy|none",
  "culturalStyle": "string",
  "summary": "string"
}

Rules:
- "dominantColors" is 1–4 hex codes (with #) covering the most prominent colors of the design.
- "embroideryType" describes the technique if visible (e.g. "zardozi", "gota patti", "thread embroidery", "sequin work", "mirror work", "lace overlay", "bead work", "tilla", "resham"). Use null when there is no embroidery (plain fabric swatches).
- "stitchingDensity" reflects how busy the design is. Use "none" for plain fabric, "heavy" for full bridal couture work.
- "culturalStyle" is a short label like "Pakistani bridal", "Indian festive", "minimal western", "Arab modern", "casual contemporary". Be specific — this is the most important field for downstream prompting.
- "summary" is ONE short sentence (max 160 chars) describing the design so an image model can reproduce it. Include shape, motif, and any standout feature. Example: "Round neckline with heavy gold zardozi work and pearl drop accents in a paisley pattern."

Never include the words "I", "we", or "the user" — write the summary as a neutral design caption.`;

function buildImageDataUrl(buffer, mime = "image/jpeg") {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

const ALLOWED_DENSITY = ["light", "medium", "heavy", "none"];
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function sanitize(parsed, tag) {
  const dominantColors = Array.isArray(parsed.dominantColors)
    ? parsed.dominantColors
        .filter((c) => typeof c === "string" && HEX_RE.test(c))
        .map((c) => c.toUpperCase())
        .slice(0, 4)
    : [];
  const embroideryType =
    typeof parsed.embroideryType === "string"
      ? parsed.embroideryType.slice(0, 80)
      : null;
  const stitchingDensity = ALLOWED_DENSITY.includes(parsed.stitchingDensity)
    ? parsed.stitchingDensity
    : "medium";
  const culturalStyle =
    typeof parsed.culturalStyle === "string"
      ? parsed.culturalStyle.slice(0, 80)
      : "contemporary";
  const summary =
    typeof parsed.summary === "string"
      ? parsed.summary.slice(0, 200)
      : `Design reference (${tag}).`;

  return {
    tag,
    dominantColors,
    embroideryType,
    stitchingDensity,
    culturalStyle,
    summary,
    model: OPENAI_VISION_MODEL
  };
}

/**
 * Analyze a single design reference image. Cheap, deterministic, runs at
 * upload time so /generate doesn't pay for vision on every regeneration.
 *
 * @param {Buffer} imageBuffer
 * @param {string} tag — neck|sleeves|back|front|daman|trouser|dupatta|embroidery|fabric|other
 */
export async function analyzeDesignReference(imageBuffer, tag) {
  const normalized = await sharp(imageBuffer)
    .rotate()
    .resize(ANALYZE_SIZE, ANALYZE_SIZE, {
      fit: "inside",
      withoutEnlargement: true
    })
    .jpeg({ quality: ANALYZE_QUALITY })
    .toBuffer();

  const dataUrl = buildImageDataUrl(normalized, "image/jpeg");

  const completion = await openai.chat.completions.create({
    model: OPENAI_VISION_MODEL,
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `This image is the user's reference for the "${tag}" of a new outfit. Analyze it and return the JSON described above.`
          },
          { type: "image_url", image_url: { url: dataUrl } }
        ]
      }
    ]
  });

  const raw = completion.choices?.[0]?.message?.content ?? "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Design analysis model returned invalid JSON");
  }
  return sanitize(parsed, tag);
}
