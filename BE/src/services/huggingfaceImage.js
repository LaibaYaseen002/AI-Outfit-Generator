// Hugging Face Inference API image provider.
// Free tier — get a token at https://huggingface.co/settings/tokens (Read scope).
//
// Default model is FLUX.1-schnell (fast, photorealistic). Override with
// HF_IMAGE_MODEL to use SDXL or any other text-to-image model on the Hub.

const HF_API_KEY = process.env.HF_API_KEY;
const HF_IMAGE_MODEL =
  process.env.HF_IMAGE_MODEL || "black-forest-labs/FLUX.1-schnell";

if (!HF_API_KEY && process.env.IMAGE_PROVIDER === "huggingface") {
  // eslint-disable-next-line no-console
  console.warn(
    "[huggingfaceImage] HF_API_KEY is missing — outfit preview generation will fail."
  );
}

// HF deprecated the legacy api-inference.huggingface.co URL in 2025; use the
// new Inference Providers router. This requires a token with the
// "Make calls to Inference Providers" scope (create a fine-grained token).
function endpoint(model) {
  return `https://router.huggingface.co/hf-inference/models/${model}`;
}

// HF returns 503 with { estimated_time } while the model is cold-loading.
// Retry once after the suggested wait, capped so we don't hang forever.
async function callOnce(prompt, { width = 1024, height = 1024 } = {}) {
  const res = await fetch(endpoint(HF_IMAGE_MODEL), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${HF_API_KEY ?? ""}`,
      "Content-Type": "application/json",
      Accept: "image/png"
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { width, height },
      // Force a fresh inference; without this, HF can return cached blobs.
      options: { wait_for_model: true }
    })
  });

  if (!res.ok) {
    // Read body ONCE — calling .json() then .text() on the same response
    // throws because the stream is already consumed.
    const text = await res.text().catch(() => "");
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON */
    }
    const detail =
      parsed?.error ||
      parsed?.message ||
      text ||
      `status ${res.status} ${res.statusText || ""}`.trim();

    // eslint-disable-next-line no-console
    console.error(
      `[huggingfaceImage] ${HF_IMAGE_MODEL} -> ${res.status}: ${detail}`
    );

    const err = new Error(`HF ${res.status}: ${detail}`);
    err.status = res.status;
    err.estimatedTime = parsed?.estimated_time;
    throw err;
  }

  // HF can technically return an error JSON with a 200 — guard against it.
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await res.json().catch(() => null);
    const detail = body?.error || body?.message || "Non-image JSON response";
    // eslint-disable-next-line no-console
    console.error(`[huggingfaceImage] 200 with JSON body: ${detail}`);
    throw new Error(`HF returned JSON instead of image: ${detail}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  return buf.toString("base64");
}

export async function generateImageBase64(prompt, options) {
  try {
    return await callOnce(prompt, options);
  } catch (err) {
    // Cold-start: wait the model's suggested time (capped) and retry once.
    if (err.status === 503 && typeof err.estimatedTime === "number") {
      const waitMs = Math.min(Math.ceil(err.estimatedTime * 1000), 60_000);
      await new Promise((r) => setTimeout(r, waitMs));
      return callOnce(prompt, options);
    }
    throw err;
  }
}

export const HF_MODEL_NAME = HF_IMAGE_MODEL;
