// Thin Pollinations.ai image-generation client. Pollinations exposes a simple
// URL-based GET endpoint that returns the image bytes directly — no API key,
// no signup, no polling. We use it for the AI Fashion Designer because it's
// the only "no card required" provider that still works for image-conditioned
// generation as of 2026.
//
// Endpoint shape:
//   GET https://image.pollinations.ai/prompt/{urlencoded-prompt}
//     ?model=flux
//     &width=1024&height=1024
//     &image=<reference-url>     ← conditioning image (honored by models that support it)
//     &nologo=true&private=true  ← strip watermark, keep result out of the public feed
//     &referrer=<app-name>       ← shown in their analytics, otherwise cosmetic
//
// Models we care about:
//   - flux           — general FLUX.1-dev, reliable default
//   - flux-realism   — photoreal LoRA, good for outfit photography
//   - kontext        — FLUX.1 Kontext (image-edit), best when an image ref matters

const API_BASE = "https://image.pollinations.ai/prompt";

/**
 * Generate an image from a prompt + optional single reference image.
 * Returns the raw bytes of the produced image.
 *
 * Pollinations conditions on at most one reference image via `?image=URL`,
 * so callers should pick the most important reference upstream and weave
 * the rest into the prompt text.
 *
 * @param {object} args
 * @param {string} args.model
 * @param {string} args.prompt
 * @param {string} [args.imageUrl] — public/signed URL of the conditioning reference
 * @param {number} [args.width=1024]
 * @param {number} [args.height=1024]
 * @param {number} [args.timeoutMs=120000] — first-request cold starts can take ~30s
 * @returns {Promise<{buffer: Buffer, mime: string}>}
 */
export async function generateImageWithPollinations({
  model,
  prompt,
  imageUrl,
  width = 1024,
  height = 1024,
  timeoutMs = 120_000
}) {
  const url = new URL(`${API_BASE}/${encodeURIComponent(prompt)}`);
  url.searchParams.set("model", model);
  url.searchParams.set("width", String(width));
  url.searchParams.set("height", String(height));
  url.searchParams.set("nologo", "true");
  url.searchParams.set("private", "true");
  url.searchParams.set("referrer", "ai-outfit-generator");
  if (imageUrl) url.searchParams.set("image", imageUrl);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(url, { signal: controller.signal });
  } catch (err) {
    if (err.name === "AbortError") {
      const e = new Error(
        `[pollinations] request timed out after ${timeoutMs}ms — model cold start can be slow, try again`
      );
      e.status = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(
      `[pollinations] HTTP ${res.status}${text ? `: ${text.slice(0, 300)}` : ""}`
    );
    err.status = res.status;
    throw err;
  }

  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  if (!contentType.startsWith("image/")) {
    // Pollinations returns HTML/JSON error pages with 200 sometimes; guard.
    const sample = await res.text().catch(() => "");
    throw new Error(
      `[pollinations] expected image, got ${contentType}${sample ? `: ${sample.slice(0, 200)}` : ""}`
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mime: contentType };
}
