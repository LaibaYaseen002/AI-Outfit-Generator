import { generateOutfit } from "../services/outfit.js";
import { saveRecommendation } from "./historyController.js";
import { getWardrobeCatalog } from "./wardrobeController.js";

const ALLOWED_TONES = ["light", "medium", "dark"];
const ALLOWED_GENDERS = ["male", "female"];
const ALLOWED_AGE_GROUPS = ["child", "teenager", "adult"];
const ALLOWED_REGIONS = [
  "pakistani",
  "indian",
  "bangladeshi",
  "arab",
  "western"
];
const WEATHER_BUCKETS = ["freezing", "cold", "cool", "mild", "warm", "hot"];
const WEATHER_CONDITIONS = [
  "clear",
  "cloudy",
  "rain",
  "snow",
  "thunder",
  "fog"
];

function validateOptionalEnum(value, allowed, fieldName) {
  if (value == null) return null;
  if (typeof value !== "string" || !allowed.includes(value)) {
    return {
      error: `'${fieldName}' must be one of: ${allowed.join(", ")}`
    };
  }
  return value;
}

function pickNumber(value) {
  if (value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Trust-but-validate the weather payload coming from the FE. We don't re-fetch
 * here — the FE already called /api/weather. We just guard against junk that
 * would derail the prompt or fail the JSON.stringify on persist.
 */
function sanitizeWeather(raw) {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "'weather' must be an object" };
  }

  const tempC = pickNumber(raw.tempC);
  if (tempC == null) {
    return { error: "'weather.tempC' must be a finite number" };
  }
  if (raw.bucket && !WEATHER_BUCKETS.includes(raw.bucket)) {
    return {
      error: `'weather.bucket' must be one of: ${WEATHER_BUCKETS.join(", ")}`
    };
  }
  if (raw.condition && !WEATHER_CONDITIONS.includes(raw.condition)) {
    return {
      error: `'weather.condition' must be one of: ${WEATHER_CONDITIONS.join(", ")}`
    };
  }

  return {
    tempC,
    feelsLikeC: pickNumber(raw.feelsLikeC),
    tempMinC: pickNumber(raw.tempMinC),
    tempMaxC: pickNumber(raw.tempMaxC),
    condition: typeof raw.condition === "string" ? raw.condition : null,
    conditionLabel:
      typeof raw.conditionLabel === "string"
        ? raw.conditionLabel.slice(0, 80)
        : null,
    bucket: typeof raw.bucket === "string" ? raw.bucket : null,
    windKph: pickNumber(raw.windKph),
    precipitationMm: pickNumber(raw.precipitationMm),
    humidity: pickNumber(raw.humidity),
    isDaytime: typeof raw.isDaytime === "boolean" ? raw.isDaytime : null,
    target: raw.target === "forecast" ? "forecast" : "current",
    date: typeof raw.date === "string" ? raw.date.slice(0, 10) : null,
    locationLabel:
      typeof raw.locationLabel === "string"
        ? raw.locationLabel.slice(0, 120)
        : null,
    timezone:
      typeof raw.timezone === "string" ? raw.timezone.slice(0, 80) : null,
    provider: typeof raw.provider === "string" ? raw.provider : "open-meteo"
  };
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
      ageGroup: ageGroupRaw,
      region: regionRaw,
      weather: weatherRaw,
      wardrobeOnly: wardrobeOnlyRaw
    } = req.body ?? {};
    const wardrobeOnly = wardrobeOnlyRaw === true;

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

    const regionResult = validateOptionalEnum(
      regionRaw,
      ALLOWED_REGIONS,
      "region"
    );
    if (regionResult && typeof regionResult === "object" && regionResult.error) {
      return res
        .status(400)
        .json({ error: { message: regionResult.error, status: 400 } });
    }
    const region = regionResult;

    const weatherResult = sanitizeWeather(weatherRaw);
    if (weatherResult && weatherResult.error) {
      return res
        .status(400)
        .json({ error: { message: weatherResult.error, status: 400 } });
    }
    const weather = weatherResult;

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

    let wardrobe = null;
    if (wardrobeOnly) {
      wardrobe = await getWardrobeCatalog(req.user.id);
      if (!wardrobe.length) {
        return res.status(400).json({
          error: {
            message:
              "Your wardrobe is empty — add items first or turn off wardrobe-only mode.",
            status: 400,
            code: "EMPTY_WARDROBE"
          }
        });
      }
    }

    const result = await generateOutfit({
      gender,
      ageGroup,
      skinTone,
      skinHex,
      occasion,
      region,
      weather,
      preferences: preferences ?? {},
      wardrobe
    });

    // Persist appearance + weather + wardrobe refs alongside other prefs so
    // we don't need new SQL columns. The FE reads these back from the
    // recommendation row.
    const persistedPreferences = {
      ...(preferences ?? {}),
      ...(gender ? { gender } : {}),
      ...(ageGroup ? { ageGroup } : {}),
      ...(region ? { region } : {}),
      ...(weather ? { weather } : {}),
      ...(wardrobeOnly ? { wardrobeOnly: true } : {}),
      ...(result.outfitItemRefs ? { outfitItemRefs: result.outfitItemRefs } : {})
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

    // New recommendations always start un-favorited; including the field
    // here so the FE can show an unfilled-heart toggle immediately.
    res.json({ ...result, id: savedId, is_favorite: false });
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
