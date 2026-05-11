import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const baseURL = process.env.OPENAI_BASE_URL; // optional: any OpenAI-compatible endpoint (Groq, OpenRouter, Together, etc.)

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[openai] OPENAI_API_KEY is missing — /api/outfit/generate will fail until it's set in BE/.env"
  );
}

export const openai = new OpenAI({
  apiKey: apiKey ?? "",
  ...(baseURL ? { baseURL } : {})
});

export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

// Vision-capable model for image analysis (appearance detection).
// Falls back to OPENAI_MODEL — only set this when OPENAI_MODEL is text-only
// (e.g. Groq's llama-3.3-70b-versatile).
export const OPENAI_VISION_MODEL =
  process.env.OPENAI_VISION_MODEL || OPENAI_MODEL;
