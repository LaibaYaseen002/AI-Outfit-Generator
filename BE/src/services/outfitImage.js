import { randomUUID } from "crypto";
import { openaiImage, IMAGE_MODEL, IMAGE_SIZE } from "./openaiImage.js";
import { supabaseAdmin } from "./supabase.js";

const BUCKET = process.env.SUPABASE_BUCKET || "user-photos";

const TONE_DESCRIPTIONS = {
  light: "light skin tone",
  medium: "medium / olive skin tone",
  dark: "deep / dark skin tone"
};

export function buildImagePrompt({
  outfit,
  colors,
  occasion,
  skinTone,
  preferences
}) {
  const toneDesc = TONE_DESCRIPTIONS[skinTone] ?? "natural skin tone";
  const palette = Array.isArray(colors) && colors.length
    ? `Color palette: ${colors.join(", ")}.`
    : "";
  const accessories = Array.isArray(outfit?.accessories) && outfit.accessories.length
    ? `Accessories: ${outfit.accessories.join(", ")}.`
    : "";
  const styleHint = preferences?.style ? `Overall style: ${preferences.style}.` : "";

  return [
    `Full-body fashion editorial photograph of a single mannequin-styled model with a ${toneDesc}, standing against a clean neutral light-grey studio backdrop, soft even lighting, photorealistic.`,
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

export async function generateOutfitImage({ userId, recommendation }) {
  const prompt = buildImagePrompt({
    outfit: recommendation.outfit,
    colors: recommendation.colors,
    occasion: recommendation.occasion,
    skinTone: recommendation.skin_tone,
    preferences: recommendation.preferences
  });

  const response = await openaiImage.images.generate({
    model: IMAGE_MODEL,
    prompt,
    size: IMAGE_SIZE,
    n: 1
  });

  const b64 = response?.data?.[0]?.b64_json;
  if (!b64) {
    // Some compatible providers return a URL instead of base64.
    const url = response?.data?.[0]?.url;
    if (!url) throw new Error("Image API returned no image");
    const fetched = await fetch(url);
    if (!fetched.ok) throw new Error(`Failed to download generated image: ${fetched.status}`);
    const arr = Buffer.from(await fetched.arrayBuffer()).toString("base64");
    return uploadPng({ userId, base64: arr });
  }

  return uploadPng({ userId, base64: b64 });
}
