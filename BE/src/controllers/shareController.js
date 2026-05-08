import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "../services/supabase.js";

const TABLE = "recommendations";
const BUCKET = process.env.SUPABASE_BUCKET || "user-photos";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

function generateToken() {
  return randomBytes(32).toString("base64url");
}

async function maybeSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data?.signedUrl ?? null;
}

// Lean public projection — strips user_id, the user's selfie path
// (image_path), free-text preferences notes, and other internal fields.
// Anyone with the token can see this, so it must not leak PII.
function shapePublic(rec, signedUrl) {
  return {
    token: rec.share_token,
    outfit: rec.outfit,
    colors: rec.colors,
    explanation: rec.explanation,
    occasion: rec.occasion,
    skinTone: rec.skin_tone,
    imageUrl: signedUrl,
    createdAt: rec.created_at
  };
}

// POST /api/history/:id/share — idempotent. Returns existing token if one
// is already set; otherwise mints a new one.
export async function createShare(req, res, next) {
  try {
    const { id } = req.params;

    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from(TABLE)
      .select("id, share_token")
      .eq("id", id)
      .eq("user_id", req.user.id)
      .maybeSingle();

    if (fetchErr) {
      return res
        .status(500)
        .json({ error: { message: fetchErr.message, status: 500 } });
    }
    if (!existing) {
      return res
        .status(404)
        .json({ error: { message: "Recommendation not found", status: 404 } });
    }

    if (existing.share_token) {
      return res.json({ id: existing.id, token: existing.share_token });
    }

    const token = generateToken();
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from(TABLE)
      .update({ share_token: token })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("id, share_token")
      .maybeSingle();

    if (updateErr) {
      return res
        .status(500)
        .json({ error: { message: updateErr.message, status: 500 } });
    }
    if (!updated) {
      return res
        .status(404)
        .json({ error: { message: "Recommendation not found", status: 404 } });
    }

    res.status(201).json({ id: updated.id, token: updated.share_token });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/history/:id/share — revokes the public link.
export async function revokeShare(req, res, next) {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update({ share_token: null })
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return res
        .status(500)
        .json({ error: { message: error.message, status: 500 } });
    }
    if (!data) {
      return res
        .status(404)
        .json({ error: { message: "Recommendation not found", status: 404 } });
    }

    res.json({ id: data.id, revoked: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/share/:token — public, no auth.
export async function getPublicShare(req, res, next) {
  try {
    const { token } = req.params;
    if (!token || typeof token !== "string" || token.length < 16) {
      return res
        .status(400)
        .json({ error: { message: "Invalid share token", status: 400 } });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select(
        "id, outfit, colors, explanation, occasion, skin_tone, outfit_image_path, image_status, share_token, created_at"
      )
      .eq("share_token", token)
      .maybeSingle();

    if (error) {
      return res
        .status(500)
        .json({ error: { message: error.message, status: 500 } });
    }
    if (!data) {
      return res
        .status(404)
        .json({ error: { message: "Shared outfit not found", status: 404 } });
    }

    const url =
      data.image_status === "ready" && data.outfit_image_path
        ? await maybeSignedUrl(data.outfit_image_path)
        : null;

    res.json(shapePublic(data, url));
  } catch (err) {
    next(err);
  }
}
