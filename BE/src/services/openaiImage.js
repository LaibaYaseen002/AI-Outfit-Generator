import OpenAI from "openai";

// Image generation may need to target a different provider than the text LLM.
// (Groq/OpenRouter/Together don't host image models.) Fall back to the text
// OpenAI credentials when not overridden.
const apiKey = process.env.IMAGE_API_KEY || process.env.OPENAI_API_KEY;
const baseURL = process.env.IMAGE_BASE_URL || undefined;

if (!apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[openaiImage] No IMAGE_API_KEY or OPENAI_API_KEY set — outfit preview generation will fail."
  );
}

export const openaiImage = new OpenAI({
  apiKey: apiKey ?? "",
  ...(baseURL ? { baseURL } : {})
});

export const IMAGE_MODEL = process.env.IMAGE_MODEL || "gpt-image-1";
export const IMAGE_SIZE = process.env.IMAGE_SIZE || "1024x1536";
