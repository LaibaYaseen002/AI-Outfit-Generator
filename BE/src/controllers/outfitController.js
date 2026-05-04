import { generateOutfit } from "../services/outfit.js";
import { saveRecommendation } from "./historyController.js";

const ALLOWED_TONES = ["light", "medium", "dark"];

export async function postGenerateOutfit(req, res, next) {
  try {
    const { skinTone, skinHex, occasion, preferences, imagePath } =
      req.body ?? {};

    if (!skinTone || !ALLOWED_TONES.includes(skinTone)) {
      return res.status(400).json({
        error: {
          message: `'skinTone' must be one of: ${ALLOWED_TONES.join(", ")}`,
          status: 400
        }
      });
    }
    if (!occasion || typeof occasion !== "string") {
      return res
        .status(400)
        .json({ error: { message: "'occasion' is required", status: 400 } });
    }

    // If the FE forwards the image storage path, validate it belongs to this user
    // (same convention as upload/skin-tone — first folder is the owner ID).
    if (imagePath != null) {
      if (typeof imagePath !== "string") {
        return res.status(400).json({
          error: { message: "'imagePath' must be a string", status: 400 }
        });
      }
      const ownerId = imagePath.split("/")[0];
      if (ownerId !== req.user.id) {
        return res
          .status(403)
          .json({ error: { message: "Forbidden", status: 403 } });
      }
    }

    const result = await generateOutfit({
      skinTone,
      skinHex,
      occasion,
      preferences: preferences ?? {}
    });

    let savedId = null;
    try {
      const saved = await saveRecommendation({
        userId: req.user.id,
        imagePath: imagePath ?? null,
        skinTone,
        skinHex,
        occasion,
        preferences: preferences ?? {},
        outfit: result.outfit,
        colors: result.colors,
        explanation: result.explanation,
        model: result.model
      });
      savedId = saved.id;
    } catch (saveErr) {
      // Don't fail the request if persistence fails — the user still gets
      // their outfit. Log so we can investigate misconfigured tables.
      // eslint-disable-next-line no-console
      console.error("[history] Failed to save recommendation:", saveErr);
    }

    res.json({ ...result, id: savedId });
  } catch (err) {
    // Surface OpenAI errors with a 502 so the FE can distinguish from a 500
    if (err?.status && err?.error) {
      return res.status(502).json({
        error: {
          message: err.error?.message ?? err.message ?? "AI request failed",
          status: 502
        }
      });
    }
    next(err);
  }
}
