import { randomUUID } from "crypto";
import { openaiImage, IMAGE_MODEL, IMAGE_SIZE } from "./openaiImage.js";
import { generateImageBase64 as hfGenerate } from "./huggingfaceImage.js";
import { supabaseAdmin } from "./supabase.js";

const BUCKET = process.env.SUPABASE_BUCKET || "user-photos";
const PROVIDER = (process.env.IMAGE_PROVIDER || "huggingface").toLowerCase();

const TONE_DESCRIPTIONS = {
  light: "light skin tone",
  medium: "medium / olive skin tone",
  dark: "deep / dark skin tone"
};

// Picks the right mannequin/model archetype from the detected appearance.
function describeSubject({ gender, ageGroup, toneDesc }) {
  const ageWord =
    ageGroup === "child"
      ? "child"
      : ageGroup === "teenager"
        ? "teenage"
        : "adult";
  const genderWord =
    gender === "male"
      ? ageGroup === "child"
        ? "boy"
        : "man"
      : gender === "female"
        ? ageGroup === "child"
          ? "girl"
          : "woman"
        : "person";
  // "adult man" is redundant; drop "adult" qualifier when not a child/teen
  const ageQualifier =
    ageGroup === "child" || ageGroup === "teenager" ? `${ageWord} ` : "";
  return `${ageQualifier}${genderWord} with a ${toneDesc}`;
}

export function buildImagePrompt({
  outfit,
  colors,
  occasion,
  skinTone,
  gender,
  ageGroup,
  preferences
}) {
  const toneDesc = TONE_DESCRIPTIONS[skinTone] ?? "natural skin tone";
  const subject = describeSubject({ gender, ageGroup, toneDesc });
  const palette = Array.isArray(colors) && colors.length
    ? `Color palette: ${colors.join(", ")}.`
    : "";
  const accessories = Array.isArray(outfit?.accessories) && outfit.accessories.length
    ? `Accessories: ${outfit.accessories.join(", ")}.`
    : "";
  const styleHint = preferences?.style ? `Overall style: ${preferences.style}.` : "";

  return [
    `Full-body fashion editorial photograph of a single mannequin-styled ${subject}, standing against a clean neutral light-grey studio backdrop, soft even lighting, photorealistic.`,
    `The model is wearing the following complete outfit for ${occasion}:`,
    `Top: ${outfit.top}.`,
    `Bottom: ${outfit.bottom}.`,
    `Footwear: ${outfit.footwear}.`,
    accessories,
    palette,
    styleHint,
    `Tasteful pose, natural posture, no text, no watermark, no logo, no brand markings. Show the entire outfit head-to-toe.`
  ]
    .filter(Boolean)
    .join(" ");
}

async function uploadPng({ userId, base64 }) {
  const buffer = Buffer.from(base64, "base64");
  const path = `${userId}/outfits/${randomUUID()}.png`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: "image/png",
      upsert: false
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);
  return path;
}

function parseSize(size) {
  const [w, h] = String(size).split("x").map((n) => parseInt(n, 10));
  if (!Number.isFinite(w) || !Number.isFinite(h)) return { width: 1024, height: 1024 };
  return { width: w, height: h };
}

async function generateBase64ViaOpenAI(prompt) {
  const response = await openaiImage.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size: IMAGE_SIZE,
    n: 1
  });

  const b64 = response?.data?.[0]?.b64_json;
  if (b64) return b64;

  const url = response?.data?.[0]?.url;
  if (!url) throw new Error("Image API returned no image");
  const fetched = await fetch(url);
  if (!fetched.ok) throw new Error(`Failed to download generated image: ${fetched.status}`);
  return Buffer.from(await fetched.arrayBuffer()).toString("base64");
}

export async function generateOutfitImage({ userId, recommendation }) {
  // Appearance attrs were stashed inside preferences by the outfit controller.
  const appearance = recommendation.preferences ?? {};
  const prompt = buildImagePrompt({
    outfit: recommendation.outfit,
    colors: recommendation.colors,
    occasion: recommendation.occasion,
    skinTone: recommendation.skin_tone,
    gender: appearance.gender ?? null,
    ageGroup: appearance.ageGroup ?? null,
    preferences: recommendation.preferences
  });

  let base64;
  if (PROVIDER === "openai") {
    base64 = await generateBase64ViaOpenAI(prompt);
  } else if (PROVIDER === "huggingface") {
    const { width, height } = parseSize(IMAGE_SIZE);
    base64 = await hfGenerate(prompt, { width, height });
  } else {
    throw new Error(
      `Unknown IMAGE_PROVIDER: '${PROVIDER}'. Use 'huggingface' or 'openai'.`
    );
  }

  return uploadPng({ userId, base64 });
}
