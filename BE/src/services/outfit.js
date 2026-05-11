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

Cultural & regional guidance (apply ONLY when the occasion is one of: eid, mehndi, walima, diwali, holi, wedding — and especially when "Region" is provided):

Region-specific vocabulary:
- pakistani / indian / bangladeshi → South Asian wardrobe. Use these terms naturally:
    Garments: shalwar kameez, kurta, kurta-pajama, kurti, sherwani, achkan, anarkali suit, lehenga choli, sharara, gharara, saree, salwar.
    Footwear: khussa, peshawari chappal, kolhapuri, juttis, embroidered mojari.
    Accessories: dupatta, stole, jhumka earrings, maang tikka, kalgi, gold/silver bangles, kundan set, gota patti detailing.
- arab → thobe / dishdasha / jalabiya / bisht for men; abaya / kaftan / jalabiya for women. Modest cuts, clean lines, light embroidery, neutral and pastel palettes.
- western → standard western styling, no culture-specific garments.

Occasion-specific styling:
- eid → Eid-ul-Fitr leans pastel & clean (cream, lilac, mint, sky blue, soft pink); Eid-ul-Adha leans deeper warm tones (maroon, olive, gold). Always fresh, modestly cut, light embroidery, closed dressy footwear.
- mehndi → Pre-wedding bright daytime/evening event. Yellows, greens, oranges, magenta. Floral motifs, mirror-work, gota patti. Comfortable for dancing — no restrictive heavy gowns.
- walima → Formal post-wedding reception. Gold and silver tones, heavy embroidery, jewelled accessories. Sherwani, formal saree, heavy gown, or anarkali. Closed formal footwear.
- diwali → Festive evening. Rich jewel tones — deep red, royal blue, emerald, mustard, gold. Saree, lehenga, sherwani, or formal kurta-pajama. Gold jewellery encouraged.
- holi → Color-festival, daytime, outdoor. Light cotton kurta or casual clothes the wearer doesn't mind staining. White or off-white is traditional. Avoid heavy embroidery or expensive fabrics.
- wedding (when Region is South Asian) → upgrade to the most formal culturally appropriate look (sherwani / heavy lehenga / formal saree). When Region is western or unspecified, default to western formal.

If Region is not provided but the occasion is cultural, default to neutral South Asian styling for mehndi/walima/eid; for diwali/holi default to Indian; skip culture-specific cues only when the occasion does not strictly require them.

When applying cultural styling, the explanation MUST briefly name the cultural reasoning (e.g., "A pastel shalwar kameez fits Eid-ul-Fitr's clean, fresh palette…").`;

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
  region,
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
  if (region) lines.push(`Region: ${region}`);

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
    region,
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
          region,
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
    region: region ?? null,
    skinTone,
    occasion,
    model: OPENAI_MODEL
  };
}
