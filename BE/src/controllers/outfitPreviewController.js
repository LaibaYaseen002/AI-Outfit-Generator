import { supabaseAdmin } from "../services/supabase.js";
import { generateOutfitImage } from "../services/outfitImage.js";
import {
  getRecommendationForUser,
  updateImageStatus
} from "./historyController.js";

const BUCKET = process.env.SUPABASE_BUCKET || "user-photos";
const SIGNED_URL_TTL = 60 * 60; // 1 hour

async function maybeSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data?.signedUrl ?? null;
}

function shapePreview(rec, signedUrl) {
  return {
    id: rec.id,
    status: rec.image_status,
    imagePath: rec.outfit_image_path,
    imageUrl: signedUrl,
    error: rec.image_error,
    updatedAt: rec.image_updated_at
  };
}

// Fire-and-forget worker. Updates the row through its lifecycle.
async function runImageJob(recommendationId, userId) {
  try {
    await updateImageStatus(recommendationId, {
      image_status: "generating",
      image_error: null
    });

    const rec = await getRecommendationForUser(recommendationId, userId);
    if (!rec) throw new Error("Recommendation no longer exists");

    const path = await generateOutfitImage({ userId, recommendation: rec });

    await updateImageStatus(recommendationId, {
      image_status: "ready",
      outfit_image_path: path,
      image_error: null
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[preview] image job failed:", err);
    try {
      await updateImageStatus(recommendationId, {
        image_status: "failed",
        image_error: err?.message ?? "Image generation failed"
      });
    } catch (updateErr) {
      // eslint-disable-next-line no-console
      console.error("[preview] failed to record failure:", updateErr);
    }
  }
}

export async function postOutfitPreview(req, res, next) {
  try {
    const { id } = req.params;
    const rec = await getRecommendationForUser(id, req.user.id);
    if (!rec) {
      return res
        .status(404)
        .json({ error: { message: "Recommendation not found", status: 404 } });
    }

    // Idempotent: don't kick off a second job if one is already running or done.
    if (rec.image_status === "generating" || rec.image_status === "pending") {
      return res.json(shapePreview(rec, null));
    }
    if (rec.image_status === "ready" && rec.outfit_image_path) {
      const url = await maybeSignedUrl(rec.outfit_image_path);
      return res.json(shapePreview(rec, url));
    }

    // Mark pending synchronously so a second concurrent POST sees it.
    await updateImageStatus(id, {
      image_status: "pending",
      image_error: null
    });

    // Kick off background work — do not await.
    setImmediate(() => {
      runImageJob(id, req.user.id);
    });

    res.status(202).json({
      id: rec.id,
      status: "pending",
      imagePath: null,
      imageUrl: null,
      error: null,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    next(err);
  }
}

export async function getOutfitPreview(req, res, next) {
  try {
    const { id } = req.params;
    const rec = await getRecommendationForUser(id, req.user.id);
    if (!rec) {
      return res
        .status(404)
        .json({ error: { message: "Recommendation not found", status: 404 } });
    }

    const url =
      rec.image_status === "ready" && rec.outfit_image_path
        ? await maybeSignedUrl(rec.outfit_image_path)
        : null;

    res.json(shapePreview(rec, url));
  } catch (err) {
    next(err);
  }
}
