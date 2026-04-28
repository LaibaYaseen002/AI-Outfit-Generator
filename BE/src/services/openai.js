import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[openai] OPENAI_API_KEY is missing — /api/outfit/generate will fail until it's set in BE/.env"
  );
}

export const openai = new OpenAI({ apiKey: apiKey ?? "" });
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
