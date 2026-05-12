import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "./supabase.js";
import { generateImageWithPollinations } from "./pollinations.js";

const BUCKET = process.env.SUPABASE_BUCKET || "user-photos";
const DESIGN_IMAGE_MODEL = process.env.DESIGN_IMAGE_MODEL || "flux";
const REF_URL_TTL = 60 * 60; // 1 hour — Pollinations fetches the ref within seconds

async function signedUrlForRef(path) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, REF_URL_TTL);
  if (error || !data?.signedUrl) {
    throw new Error(
      `Could not sign URL for reference ${path}: ${error?.message ?? "unknown"}`
    );
  }
  return data.signedUrl;
}

async function uploadOutput({ userId, buffer, mime }) {
  const ext = mime === "image/png" ? "png" : "jpg";
  const path = `${userId}/designs/${randomUUID()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mime, upsert: false });
  if (error) throw new Error(`Output upload failed: ${error.message}`);
  return path;
}

/**
 * Send the prompt + a primary reference image to Pollinations and persist the
 * result into our storage bucket. Returns the bucket path of the saved output.
 *
 * Pollinations conditions on at most one reference image, so we pass the
 * first reference (by convention the most important one in this UX — neck
 * or full-silhouette shot). Other references still influence the output
 * because designPrompt.js already weaves their cached analysis (colors,
 * embroidery, cultural style, summary) into the prompt text.
 *
 * @param {object} args
 * @param {string} args.userId
 * @param {string[]} args.referencePaths — storage paths, first = primary visual ref
 * @param {string} args.prompt — full text prompt from designPrompt.js
 * @param {string} args.negative — appended as an "Avoid:" clause (Pollinations has no native negative field)
 */
export async function generateDesignImage({
  userId,
  referencePaths,
  prompt,
  negative
}) {
  const imageUrls = await Promise.all(referencePaths.map(signedUrlForRef));
  const primaryRef = imageUrls[0];

  const fullPrompt = negative ? `${prompt}\n\nAvoid: ${negative}` : prompt;

  const { buffer, mime } = await generateImageWithPollinations({
    model: DESIGN_IMAGE_MODEL,
    prompt: fullPrompt,
    imageUrl: primaryRef
  });

  const path = await uploadOutput({ userId, buffer, mime });
  return { path, model: DESIGN_IMAGE_MODEL };
}
