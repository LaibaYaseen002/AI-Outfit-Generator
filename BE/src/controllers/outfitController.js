import { generateOutfit } from "../services/outfit.js";

const ALLOWED_TONES = ["light", "medium", "dark"];

export async function postGenerateOutfit(req, res, next) {
  try {
    const { skinTone, skinHex, occasion, preferences } = req.body ?? {};

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

    const result = await generateOutfit({
      skinTone,
      skinHex,
      occasion,
      preferences: preferences ?? {}
    });

    res.json(result);
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
