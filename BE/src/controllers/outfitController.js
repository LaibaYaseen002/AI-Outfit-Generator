import { generateOutfit } from "../services/outfit.js";
import { saveRecommendation } from "./historyController.js";

const ALLOWED_TONES = ["light", "medium", "dark"];
const ALLOWED_GENDERS = ["male", "female"];
const ALLOWED_AGE_GROUPS = ["child", "teenager", "adult"];

function validateOptionalEnum(value, allowed, fieldName) {
  if (value == null) return null;
  if (typeof value !== "string" || !allowed.includes(value)) {
    return {
      error: `'${fieldName}' must be one of: ${allowed.join(", ")}`
    };
  }
  return value;
}

export async function postGenerateOutfit(req, res, next) {
  try {
    const {
      skinTone,
      skinHex,
      occasion,
      preferences,
      imagePath,
      gender: genderRaw,
      ageGroup: ageGroupRaw
    } = req.body ?? {};

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

    const genderResult = validateOptionalEnum(
      genderRaw,
      ALLOWED_GENDERS,
      "gender"
    );
    if (genderResult && typeof genderResult === "object" && genderResult.error) {
      return res
        .status(400)
        .json({ error: { message: genderResult.error, status: 400 } });
    }
    const ageGroupResult = validateOptionalEnum(
      ageGroupRaw,
      ALLOWED_AGE_GROUPS,
      "ageGroup"
    );
    if (
      ageGroupResult &&
      typeof ageGroupResult === "object" &&
      ageGroupResult.error
    ) {
      return res
        .status(400)
        .json({ error: { message: ageGroupResult.error, status: 400 } });
    }
    const gender = genderResult;
    const ageGroup = ageGroupResult;

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
      gender,
      ageGroup,
      skinTone,
      skinHex,
      occasion,
      preferences: preferences ?? {}
    });

    // Persist appearance attributes alongside other prefs so we don't need a
    // new SQL column. The FE reads these back from the recommendation row.
    const persistedPreferences = {
      ...(preferences ?? {}),
      ...(gender ? { gender } : {}),
      ...(ageGroup ? { ageGroup } : {})
    };

    let savedId = null;
    try {
      const saved = await saveRecommendation({
        userId: req.user.id,
        imagePath: imagePath ?? null,
        skinTone,
        skinHex,
        occasion,
        preferences: persistedPreferences,
        outfit: result.outfit,
        colors: result.colors,
        explanation: result.explanation,
        model: result.model
      });
      savedId = saved.id;
    } catch (saveErr) {
      // eslint-disable-next-line no-console
      console.error("[history] Failed to save recommendation:", saveErr);
    }

    res.json({ ...result, id: savedId });
  } catch (err) {
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
