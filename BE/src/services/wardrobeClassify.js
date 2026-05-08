import sharp from "sharp";
import { openai, OPENAI_MODEL } from "./openai.js";

const ALLOWED_CATEGORIES = [
  "top",
  "bottom",
  "footwear",
  "accessory",
  "outerwear"
];
const ALLOWED_SEASONS = [
  "all-season",
  "summer",
  "winter",
  "spring-fall",
  "rain"
];

const ANALYZE_SIZE = 512;
const ANALYZE_QUALITY = 80;

const SYSTEM_PROMPT = `You are an item-classification service for a personal-wardrobe feature in a fashion app. Given a photo of a single clothing item (or accessory), output a structured description used to suggest outfits later.

Return ONLY valid JSON matching this exact schema — no prose, no markdown, no code fences:

{
  "category": "top" | "bottom" | "footwear" | "accessory" | "outerwear",
  "name": "string (3-60 chars, e.g. 'navy linen blazer')",
  "colors": ["#RRGGBB", "..."],
  "material": "string | null",
  "season": "all-season" | "summer" | "winter" | "spring-fall" | "rain" | null,
  "occasions": ["string", "..."],
  "confidence": number,
  "reason": "string (max 120 chars)"
}

Rules:
- "category":
    - top        → shirts, t-shirts, blouses, kurta tops, sweaters worn as the primary upper layer
    - bottom     → trousers, jeans, skirts, shorts, leggings
    - footwear   → all shoes, sandals, boots
    - outerwear  → jackets, coats, blazers worn over a top
    - accessory  → belts, watches, bags, jewelry, scarves, hats, ties
- "colors" must contain 1-3 dominant hex codes including '#'.
- "occasions" — pick 1-4 from: casual, office, dinner, wedding, mehndi, eid, party, gym, beach, formal. Empty array if none clearly apply.
- "confidence" is a number in [0, 1]. Use < 0.7 for blurry photos, partially visible items, or ambiguous calls.
- If the photo shows multiple items, classify the most prominent one.
- If you cannot identify any clothing/accessory item, set confidence=0 and use category="accessory" with name="unidentified item".`;

function buildImageDataUrl(buffer, mime = "image/jpeg") {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function clampString(s, max) {
  if (typeof s !== "string") return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function normalizeHex(s) {
  if (typeof s !== "string") return null;
  const m = s.trim().match(/^#?([0-9a-fA-F]{6})$/);
  return m ? `#${m[1].toLowerCase()}` : null;
}

export async function classifyWardrobeItem(imageBuffer) {
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
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Classify the clothing item in this photo and return the JSON."
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
    throw new Error("Wardrobe classifier returned invalid JSON");
  }

  const rawCategory =
    typeof parsed.category === "string" ? parsed.category.toLowerCase() : null;
  const category = ALLOWED_CATEGORIES.includes(rawCategory)
    ? rawCategory
    : "accessory";

  const name = clampString(parsed.name, 60) ?? "Untitled item";

  const colors = Array.isArray(parsed.colors)
    ? parsed.colors
        .map(normalizeHex)
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const material = clampString(parsed.material, 60);
  const rawSeason =
    typeof parsed.season === "string" ? parsed.season.toLowerCase() : null;
  const season = ALLOWED_SEASONS.includes(rawSeason) ? rawSeason : null;

  const occasions = Array.isArray(parsed.occasions)
    ? parsed.occasions
        .map((o) => clampString(o, 30))
        .filter(Boolean)
        .slice(0, 4)
    : [];

  const confRaw = Number(parsed.confidence);
  const confidence = Number.isFinite(confRaw)
    ? Math.max(0, Math.min(1, confRaw))
    : 0;

  const reason = clampString(parsed.reason, 200) ?? "";

  return {
    category,
    name,
    colors,
    attributes: {
      material,
      season,
      occasions
    },
    confidence: Number(confidence.toFixed(2)),
    reason,
    model: OPENAI_MODEL
  };
}
