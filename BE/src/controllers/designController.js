import { supabaseAdmin } from "../services/supabase.js";
import { buildDesignPrompt } from "../services/designPrompt.js";
import { generateDesignImage } from "../services/designGenerate.js";
import { getReferencesForUser } from "./designReferenceController.js";

const TABLE = "designs";
const BUCKET = process.env.SUPABASE_BUCKET || "user-photos";
const SIGNED_URL_TTL = 60 * 60;

const ALLOWED_CONTROL_KEYS = new Set([
  "color",
  "fabric",
  "sleeveLength",
  "shirtLength",
  "trouserStyle",
  "dupattaStyle",
  "fit",
  "embroideryDensity",
  "garmentCategory",
  "culturalStyle"
]);

async function maybeSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data?.signedUrl ?? null;
}

function sanitizeControls(raw) {
  if (raw == null) return {};
  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "'controls' must be an object" };
  }
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!ALLOWED_CONTROL_KEYS.has(k)) continue;
    if (typeof v !== "string") continue;
    const trimmed = v.trim().slice(0, 60);
    if (trimmed) out[k] = trimmed;
  }
  return out;
}

async function shapeDesign(row) {
  return {
    id: row.id,
    referenceIds: row.reference_ids,
    userPrompt: row.user_prompt,
    controls: row.controls,
    builtPrompt: row.built_prompt,
    outputPath: row.output_path,
    outputUrl: await maybeSignedUrl(row.output_path),
    status: row.output_status,
    error: row.output_error,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function updateDesign(id, patch) {
  const { error } = await supabaseAdmin
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Fire-and-forget worker. Mirrors outfitPreviewController.js lifecycle.
async function runDesignJob({ designId, userId, referencePaths, prompt, negative }) {
  try {
    await updateDesign(designId, {
      output_status: "generating",
      output_error: null
    });

    const { path, model } = await generateDesignImage({
      userId,
      referencePaths,
      prompt,
      negative
    });

    await updateDesign(designId, {
      output_status: "ready",
      output_path: path,
      output_error: null,
      model
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[design] generation job failed:", err);
    try {
      await updateDesign(designId, {
        output_status: "failed",
        output_error: err?.message ?? "Generation failed"
      });
    } catch (updateErr) {
      // eslint-disable-next-line no-console
      console.error("[design] failed to record failure:", updateErr);
    }
  }
}

// POST /api/design/generate
// Body: { referenceIds: string[], userPrompt: string, controls?: object }
export async function postGenerateDesign(req, res, next) {
  try {
    const userId = req.user.id;
    const { referenceIds, userPrompt, controls: controlsRaw } = req.body ?? {};

    if (!Array.isArray(referenceIds) || referenceIds.length === 0) {
      return res.status(400).json({
        error: {
          message: "'referenceIds' must be a non-empty array",
          status: 400
        }
      });
    }
    if (referenceIds.length > 8) {
      return res.status(400).json({
        error: {
          message: "Too many references — pass at most 8.",
          status: 400
        }
      });
    }
    if (typeof userPrompt !== "string" || !userPrompt.trim()) {
      return res.status(400).json({
        error: { message: "'userPrompt' is required", status: 400 }
      });
    }

    const controls = sanitizeControls(controlsRaw);
    if (controls && controls.error) {
      return res
        .status(400)
        .json({ error: { message: controls.error, status: 400 } });
    }

    // Verify every reference belongs to the user. getReferencesForUser
    // already enforces the user_id filter — but we also surface a 400 if
    // any id is missing so the FE can show a clear message instead of a
    // mystery "0 references" generation.
    const refs = await getReferencesForUser(userId, referenceIds);
    if (refs.length !== referenceIds.length) {
      return res.status(400).json({
        error: {
          message:
            "One or more reference ids are invalid or do not belong to you.",
          status: 400
        }
      });
    }

    const analyses = refs.map((r) => ({
      tag: r.tag,
      summary: r.analysis?.summary,
      embroideryType: r.analysis?.embroideryType,
      stitchingDensity: r.analysis?.stitchingDensity,
      dominantColors: r.analysis?.dominantColors,
      culturalStyle: r.analysis?.culturalStyle
    }));

    const { prompt, negative } = buildDesignPrompt({
      userPrompt: userPrompt.trim().slice(0, 1000),
      controls,
      references: analyses
    });

    // Insert the design row in 'pending' state, return 202 to the FE so it
    // can start polling. The actual generation runs in the background.
    const { data: created, error: insertError } = await supabaseAdmin
      .from(TABLE)
      .insert({
        user_id: userId,
        reference_ids: referenceIds,
        user_prompt: userPrompt.trim().slice(0, 1000),
        controls,
        built_prompt: prompt,
        output_status: "pending"
      })
      .select("*")
      .single();
    if (insertError) {
      return res
        .status(500)
        .json({ error: { message: insertError.message, status: 500 } });
    }

    setImmediate(() => {
      runDesignJob({
        designId: created.id,
        userId,
        referencePaths: refs.map((r) => r.image_path),
        prompt,
        negative
      });
    });

    res.status(202).json(await shapeDesign(created));
  } catch (err) {
    next(err);
  }
}

// GET /api/design/:id — poll endpoint
export async function getDesign(req, res, next) {
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
        .json({ error: { message: "Design not found", status: 404 } });
    }
    res.json(await shapeDesign(data));
  } catch (err) {
    next(err);
  }
}

// GET /api/design — list user designs (most recent first)
export async function listDesigns(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) {
      return res
        .status(500)
        .json({ error: { message: error.message, status: 500 } });
    }
    const items = await Promise.all((data ?? []).map(shapeDesign));
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/design/:id
export async function deleteDesign(req, res, next) {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("id, output_path")
      .maybeSingle();
    if (error) {
      return res
        .status(500)
        .json({ error: { message: error.message, status: 500 } });
    }
    if (!data) {
      return res
        .status(404)
        .json({ error: { message: "Design not found", status: 404 } });
    }
    if (data.output_path) {
      try {
        await supabaseAdmin.storage.from(BUCKET).remove([data.output_path]);
      } catch (storageErr) {
        // eslint-disable-next-line no-console
        console.error("[design] output cleanup failed:", storageErr);
      }
    }
    res.json({ id: data.id, deleted: true });
  } catch (err) {
    next(err);
  }
}
