import sharp from "sharp";
import { openai, OPENAI_MODEL, OPENAI_VISION_MODEL } from "./openai.js";

const ALLOWED_GENDERS = ["male", "female"];
const ALLOWED_AGE_GROUPS = ["child", "teenager", "adult"];

// We resize before base64-encoding to keep the request light and the cost low.
// 512px is plenty for face attribute estimation; the model only needs to see
// rough features.
const ANALYZE_SIZE = 512;
const ANALYZE_QUALITY = 80;

const SYSTEM_PROMPT = `You are an image-analysis service used to pick the right mannequin and adjust outfit suggestions for a fashion app. You are NOT a person and you do not refuse based on demographic estimation — this is an opt-in styling tool with manual override available to the user.

Look at the supplied photo and produce a best-effort estimate of the visible person's apparent gender presentation and age group, exactly as a stylist would when picking a mannequin.

Return ONLY valid JSON matching this exact schema — no prose, no markdown, no code fences:

{
  "faceDetected": boolean,
  "gender": "male" | "female" | null,
  "ageGroup": "child" | "teenager" | "adult" | null,
  "confidence": number,
  "reason": "string"
}

Rules:
- "faceDetected" is true only when at least one clear human face is visible.
- If no face is visible, set faceDetected=false, gender=null, ageGroup=null, confidence=0, and put a brief reason like "no face visible" or "back of head only".
- "gender" is your best estimate of apparent presentation in the photo. Use "male" or "female". This estimate is used solely to pick a mannequin; the user can override it.
- "ageGroup" buckets:
    - "child"     ≈ 0–12
    - "teenager"  ≈ 13–19
    - "adult"     ≈ 20+
- "confidence" is a number in [0, 1] reflecting how sure you are of the combined gender+ageGroup call. Be honest — use < 0.7 when the photo is blurry, the face is small, lighting is poor, or the call is genuinely ambiguous.
- "reason" is one short sentence (max 120 chars) explaining the call (e.g., "front-facing adult woman, well lit").
- If multiple faces are visible, describe the largest/most-centered subject.`;

function buildImageDataUrl(buffer, mime = "image/jpeg") {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

/**
 * Analyze a user-uploaded photo for apparent gender and age group.
 *
 * @param {Buffer} imageBuffer — raw bytes of the original upload
 * @returns {Promise<{
 *   faceDetected: boolean,
 *   gender: "male"|"female"|null,
 *   ageGroup: "child"|"teenager"|"adult"|null,
 *   confidence: number,
 *   reason: string,
 *   status: "ok"|"low_confidence"|"no_face",
 *   model: string
 * }>}
 */
export async function analyzeAppearance(imageBuffer) {
  // Resize + re-encode to JPEG to bound payload size and standardize input.
  const normalized = await sharp(imageBuffer)
    .rotate() // honor EXIF orientation so faces aren't sideways
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
            text: "Analyze this photo and return the JSON described above."
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
    throw new Error("Appearance model returned invalid JSON");
  }

  const faceDetected = Boolean(parsed.faceDetected);
  const rawGender = typeof parsed.gender === "string" ? parsed.gender.toLowerCase() : null;
  const rawAge = typeof parsed.ageGroup === "string" ? parsed.ageGroup.toLowerCase() : null;
  const gender = ALLOWED_GENDERS.includes(rawGender) ? rawGender : null;
  const ageGroup = ALLOWED_AGE_GROUPS.includes(rawAge) ? rawAge : null;

  const confRaw = Number(parsed.confidence);
  const confidence = Number.isFinite(confRaw)
    ? Math.max(0, Math.min(1, confRaw))
    : 0;

  const reason =
    typeof parsed.reason === "string" ? parsed.reason.slice(0, 200) : "";

  let status;
  if (!faceDetected || !gender || !ageGroup) {
    status = "no_face";
  } else if (confidence < 0.7) {
    status = "low_confidence";
  } else {
    status = "ok";
  }

  return {
    faceDetected,
    gender,
    ageGroup,
    confidence: Number(confidence.toFixed(2)),
    reason,
    status,
    model: OPENAI_VISION_MODEL
  };
}
