import { openai, OPENAI_MODEL } from "./openai.js";

const SYSTEM_PROMPT = `You are a professional fashion stylist for the AI Outfit Generator app.
Given a person's appearance (gender presentation, age group, skin tone), the occasion, the weather, and any preferences, recommend ONE complete outfit.
Choose colors that flatter the given skin tone, are appropriate for the occasion and the person's age group, weather-appropriate, and respect the user's preferences.
Be specific (fabric, fit, exact color names) but avoid brand names.
Return ONLY valid JSON matching this exact schema — no prose, no markdown:

{
  "outfit": {
    "top": "string",
    "bottom": "string",
    "footwear": "string",
    "accessories": ["string", "..."]
  },
  "outfitItemRefs": {
    "top": "wardrobe-item-id-or-null",
    "bottom": "wardrobe-item-id-or-null",
    "footwear": "wardrobe-item-id-or-null",
    "accessories": ["wardrobe-item-id", "..."]
  },
  "colors": ["#RRGGBB", "#RRGGBB", "#RRGGBB"],
  "explanation": "1-3 sentences on why this works for the user's skin tone, age, occasion, and weather"
}

When the user provides a wardrobe catalog, you MUST pick items only from that catalog and put each chosen item's id in outfitItemRefs. The visible "top"/"bottom"/etc. strings should describe the chosen item. When no catalog is provided, omit outfitItemRefs (or send all-null) — never invent ids.

Rules:
- "colors" must contain exactly 3 hex codes (with #) representing the dominant colors of the outfit.
- "accessories" must contain 1-4 items.
- Keep each string under 80 characters.

Age-group guidance:
- child     → simple, comfortable, playful pieces; safe materials; no jewelry-heavy looks; no formal-only adult cuts.
- teenager  → trendy, casual, age-appropriate; avoid overly formal or overly mature styling.
- adult     → full styled outfits; can include formal, elevated, and statement pieces as the occasion calls.

Gender guidance:
- Use gendered garment vocabulary that matches the given presentation (e.g., shirt/dress/kurta cuts, neckline, silhouette).
- Accessories should be contextually appropriate for the gender + occasion + age combo.

Weather guidance (apply ONLY when weather is provided):
- freezing (≤ 0°C)  → heavy coat, thermal layers, gloves/scarf/beanie, insulated boots.
- cold     (1–10°C) → wool coat or insulated jacket, layers, closed boots; consider gloves on the lower end.
- cool     (11–17°C)→ light jacket / blazer / cardigan over a long sleeve; closed shoes.
- mild     (18–23°C)→ comfortable mid-weight pieces; long or short sleeves both fine.
- warm     (24–29°C)→ breathable fabrics (cotton, linen), shorter sleeves, lighter footwear.
- hot      (≥ 30°C) → very lightweight, breathable, light colors; sandals or breathable shoes; sun-friendly accessories.
- rain / drizzle    → water-resistant outerwear, closed footwear with grip, dark or rain-friendly bottoms; an umbrella as accessory if appropriate.
- snow              → waterproof boots, insulated outerwear, gloves; avoid suede/canvas.
- thunderstorm      → dress like rain + avoid metal-heavy accessories.
- fog               → layer for damp cool air; muted colors read better.
- high wind (≥ 30 km/h) → avoid loose flowing pieces; favor structured silhouettes.

When weather and occasion clash (e.g., wedding in 5°C rain), keep occasion-appropriate styling but adapt: add a tailored coat, switch suede for leather, swap open footwear for closed, etc. Always reflect the adaptation in the explanation.

Cultural guidance (apply ONLY when culture is provided):
- pakistani → ethnic vocabulary: shalwar kameez, kurta, sherwani, lehenga, saree, gharara, dupatta. For mehndi: yellows/greens/oranges, mirror/zari work, fresh florals, embroidered dupatta. For walima/baraat: rich jewel tones (deep red, royal blue, emerald), heavily embroidered formal pieces, statement jewelry, achkan/sherwani for men. For eid: pastel-or-jewel-tone shalwar kameez, polished khussa/peshawari, modest jewelry. For nikah: ivory/champagne/dusty rose for the bride, charcoal/navy sherwani or three-piece suit for the groom.
- indian → similar ethnic vocabulary: kurta-pajama, saree, lehenga choli, sherwani, anarkali. For diwali: silk fabrics, gold accents, jewel tones (maroon, emerald, sapphire), traditional motifs. For wedding ceremonies: heavy embroidery, dupatta drape, elaborate jewelry. For festive day-wear: lighter cotton/silk blends with prints.
- arab → for traditional/formal: thobe/kandura/abaya silhouettes; muted whites, beiges, dark navy; understated luxury accessories; modest cuts; gold or silver fine jewelry.
- western → contemporary global silhouettes: tailored suits, cocktail dresses, smart-casual layering. For christmas/holiday parties: velvet, sequins, deep reds/greens; for new year: metallics; for thanksgiving family dinners: warm earth tones with smart-casual layers.

Cultural styling overrides generic occasion styling when both are present (e.g., culture=pakistani + occasion=wedding → recommend shalwar kameez or sherwani, NOT a Western suit). Reflect the cultural cue in the explanation. If culture is omitted, default to contemporary Western styling.`;

function describeWeather(weather) {
  if (!weather) return null;
  const parts = [];

  if (Number.isFinite(weather.tempC)) {
    if (Number.isFinite(weather.tempMinC) && Number.isFinite(weather.tempMaxC)) {
      parts.push(
        `Temperature: ${weather.tempMinC}°C – ${weather.tempMaxC}°C (avg ${weather.tempC}°C)`
      );
    } else {
      parts.push(`Temperature: ${weather.tempC}°C`);
    }
    if (Number.isFinite(weather.feelsLikeC)) {
      parts.push(`Feels like: ${weather.feelsLikeC}°C`);
    }
  }

  if (weather.bucket) parts.push(`Temperature bucket: ${weather.bucket}`);
  if (weather.conditionLabel) parts.push(`Conditions: ${weather.conditionLabel}`);
  if (weather.condition && weather.condition !== "clear") {
    parts.push(`Condition bucket: ${weather.condition}`);
  }
  if (Number.isFinite(weather.precipitationMm) && weather.precipitationMm > 0) {
    parts.push(`Precipitation: ${weather.precipitationMm} mm`);
  }
  if (Number.isFinite(weather.windKph) && weather.windKph >= 20) {
    parts.push(`Wind: ${weather.windKph} km/h`);
  }
  if (Number.isFinite(weather.humidity) && weather.humidity >= 80) {
    parts.push(`Humidity: ${weather.humidity}%`);
  }
  if (weather.locationLabel) parts.push(`Location: ${weather.locationLabel}`);
  if (weather.target === "forecast" && weather.date) {
    parts.push(`Forecast for: ${weather.date}`);
  }

  return parts.length ? parts.join("\n") : null;
}

function describeWardrobe(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const byCategory = items.reduce((acc, it) => {
    (acc[it.category] ||= []).push(it);
    return acc;
  }, {});
  const order = ["top", "bottom", "footwear", "outerwear", "accessory"];
  const lines = [];
  for (const cat of order) {
    const list = byCategory[cat];
    if (!list?.length) continue;
    lines.push(`${cat}s:`);
    for (const it of list) {
      const colorPart = it.colors?.length ? ` (${it.colors.join("/")})` : "";
      const matPart = it.attributes?.material ? `, ${it.attributes.material}` : "";
      const occPart = it.attributes?.occasions?.length
        ? `, fits: ${it.attributes.occasions.join("/")}`
        : "";
      lines.push(`- id=${it.id} | ${it.name}${colorPart}${matPart}${occPart}`);
    }
  }
  return lines.join("\n");
}

function buildUserMessage({
  gender,
  ageGroup,
  skinTone,
  skinHex,
  occasion,
  culture,
  weather,
  preferences,
  wardrobe
}) {
  const lines = [];
  if (gender) lines.push(`Gender presentation: ${gender}`);
  if (ageGroup) lines.push(`Age group: ${ageGroup}`);
  lines.push(
    `Skin tone: ${skinTone}${skinHex ? ` (approx ${skinHex})` : ""}`
  );
  lines.push(`Occasion: ${occasion}`);
  if (culture) lines.push(`Cultural context: ${culture}`);

  const weatherBlock = describeWeather(weather);
  if (weatherBlock) {
    lines.push("Weather:");
    lines.push(weatherBlock);
  }

  if (preferences?.style) lines.push(`Preferred style: ${preferences.style}`);
  if (preferences?.colorsLike?.length)
    lines.push(`Colors they like: ${preferences.colorsLike.join(", ")}`);
  if (preferences?.colorsAvoid?.length)
    lines.push(`Colors to avoid: ${preferences.colorsAvoid.join(", ")}`);
  if (preferences?.notes) lines.push(`Extra notes: ${preferences.notes}`);

  const wardrobeBlock = describeWardrobe(wardrobe);
  if (wardrobeBlock) {
    lines.push("");
    lines.push(
      "WARDROBE-ONLY MODE: pick ONLY from the items below. Use the exact id strings in outfitItemRefs. If no suitable item exists for a slot (e.g. no footwear in the wardrobe), set that ref to null and describe what's still missing in the explanation."
    );
    lines.push(wardrobeBlock);
  }

  return lines.join("\n");
}

function sanitizeItemRefs(refs, validIds) {
  if (!refs || typeof refs !== "object") return null;
  const valid = new Set(validIds);
  const pickOne = (v) => (typeof v === "string" && valid.has(v) ? v : null);
  const accessoriesIn = Array.isArray(refs.accessories) ? refs.accessories : [];
  return {
    top: pickOne(refs.top),
    bottom: pickOne(refs.bottom),
    footwear: pickOne(refs.footwear),
    accessories: accessoriesIn.map(pickOne).filter(Boolean).slice(0, 4)
  };
}

export async function generateOutfit(input) {
  const {
    gender,
    ageGroup,
    skinTone,
    skinHex,
    occasion,
    culture,
    weather,
    preferences,
    wardrobe
  } = input;

  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    temperature: 0.8,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: buildUserMessage({
          gender,
          ageGroup,
          skinTone,
          skinHex,
          occasion,
          culture,
          weather,
          preferences,
          wardrobe
        })
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

  const itemRefs = wardrobe?.length
    ? sanitizeItemRefs(parsed.outfitItemRefs, wardrobe.map((it) => it.id))
    : null;

  return {
    outfit: parsed.outfit,
    outfitItemRefs: itemRefs,
    colors: parsed.colors,
    explanation: parsed.explanation,
    gender: gender ?? null,
    ageGroup: ageGroup ?? null,
    weather: weather ?? null,
    culture: culture ?? null,
    skinTone,
    occasion,
    model: OPENAI_MODEL
  };
}
