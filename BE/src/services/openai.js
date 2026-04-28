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
