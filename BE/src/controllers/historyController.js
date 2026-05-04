import { supabaseAdmin } from "../services/supabase.js";

const TABLE = "recommendations";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function listHistory(req, res, next) {
  try {
    const limit = Math.min(
      parsePositiveInt(req.query.limit, DEFAULT_LIMIT),
      MAX_LIMIT
    );
    const offset = parsePositiveInt(req.query.offset, 0) - 1 + 1; // 0-indexed
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;

    const { data, error, count } = await supabaseAdmin
      .from(TABLE)
      .select("*", { count: "exact" })
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .range(safeOffset, safeOffset + limit - 1);

    if (error) {
      return res
        .status(500)
        .json({ error: { message: error.message, status: 500 } });
    }

    res.json({
      items: data ?? [],
      limit,
      offset: safeOffset,
      total: count ?? 0
    });
  } catch (err) {
    next(err);
  }
}

export async function getHistoryItem(req, res, next) {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .eq("user_id", req.user.id)
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

    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function deleteHistoryItem(req, res, next) {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .delete()
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

    res.json({ id: data.id, deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function saveRecommendation({
  userId,
  imagePath,
  skinTone,
  skinHex,
  occasion,
  preferences,
  outfit,
  colors,
  explanation,
  model
}) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({
      user_id: userId,
      image_path: imagePath ?? null,
      skin_tone: skinTone,
      skin_hex: skinHex ?? null,
      occasion,
      preferences: preferences ?? {},
      outfit,
      colors,
      explanation,
      model: model ?? null
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
