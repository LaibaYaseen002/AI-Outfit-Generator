import { openai, OPENAI_MODEL } from "./openai.js";

const SYSTEM_PROMPT = `You are a professional fashion stylist for the AI Outfit Generator app.
Given a person's skin tone, the occasion, and any preferences, recommend ONE complete outfit.
Choose colors that flatter the given skin tone, are appropriate for the occasion, and respect the user's preferences.
Be specific (fabric, fit, exact color names) but avoid brand names.
Return ONLY valid JSON matching this exact schema — no prose, no markdown:

{
  "outfit": {
    "top": "string",
    "bottom": "string",
    "footwear": "string",
    "accessories": ["string", "..."]
  },
  "colors": ["#RRGGBB", "#RRGGBB", "#RRGGBB"],
  "explanation": "1-3 sentences on why this works for the user's skin tone and occasion"
}

Rules:
- "colors" must contain exactly 3 hex codes (with #) representing the dominant colors of the outfit.
- "accessories" must contain 1-4 items.
- Keep each string under 80 characters.`;

function buildUserMessage({ skinTone, skinHex, occasion, preferences }) {
  const lines = [
    `Skin tone: ${skinTone}${skinHex ? ` (approx ${skinHex})` : ""}`,
    `Occasion: ${occasion}`
  ];

  if (preferences?.style) lines.push(`Preferred style: ${preferences.style}`);
  if (preferences?.colorsLike?.length)
    lines.push(`Colors they like: ${preferences.colorsLike.join(", ")}`);
  if (preferences?.colorsAvoid?.length)
    lines.push(`Colors to avoid: ${preferences.colorsAvoid.join(", ")}`);
  if (preferences?.notes) lines.push(`Extra notes: ${preferences.notes}`);

  return lines.join("\n");
}

export async function generateOutfit(input) {
  const { skinTone, skinHex, occasion, preferences } = input;

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.8,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserMessage({ skinTone, skinHex, occasion, preferences })
      }
    ]
  });

  const raw = completion.choices?.[0]?.message?.content ?? "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid JSON");
  }

  // Light validation — surface a clear error if the model omitted a field
  const required = ["outfit", "colors", "explanation"];
  for (const key of required) {
    if (!(key in parsed)) throw new Error(`AI response missing field: ${key}`);
  }
  if (
    !parsed.outfit?.top ||
    !parsed.outfit?.bottom ||
    !parsed.outfit?.footwear ||
    !Array.isArray(parsed.outfit?.accessories)
  ) {
    throw new Error("AI response outfit is incomplete");
  }
  if (!Array.isArray(parsed.colors) || parsed.colors.length === 0) {
    throw new Error("AI response colors must be a non-empty array");
  }

  return {
    outfit: parsed.outfit,
    colors: parsed.colors,
    explanation: parsed.explanation,
    skinTone,
    occasion,
    model: OPENAI_MODEL
  };
}
