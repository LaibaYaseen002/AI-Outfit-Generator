import { supabaseAdmin } from "../services/supabase.js";
import { analyzeAppearance } from "../services/appearance.js";

const BUCKET = process.env.SUPABASE_BUCKET || "user-photos";

export async function postAnalyzeUser(req, res, next) {
  try {
    const { path } = req.body ?? {};
    if (!path || typeof path !== "string") {
      return res.status(400).json({
        error: { message: "Body field 'path' is required", status: 400 }
      });
    }

    // Path convention: <userId>/<uuid>.<ext>. Enforce ownership exactly like
    // skinToneController — never let a user analyze someone else's photo.
    const ownerId = path.split("/")[0];
    if (ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: { message: "Forbidden", status: 403 } });
    }

    const { data: download, error: dlError } = await supabaseAdmin.storage
      .from(BUCKET)
      .download(path);

    if (dlError || !download) {
      return res.status(404).json({
        error: {
          message: `Could not download image: ${dlError?.message ?? "not found"}`,
          status: 404
        }
      });
    }

    const arrayBuffer = await download.arrayBuffer();
    const result = await analyzeAppearance(Buffer.from(arrayBuffer));

    if (result.status === "no_face") {
      return res.status(400).json({
        error: {
          message: "Please upload a clear front-facing image.",
          status: 400,
          code: "NO_FACE_DETECTED",
          details: { reason: result.reason }
        }
      });
    }

    res.json({
      path,
      gender: result.gender,
      ageGroup: result.ageGroup,
      confidence: result.confidence,
      status: result.status,
      reason: result.reason
    });
  } catch (err) {
    // Surface OpenAI errors with a 502 so the FE can distinguish from a 500
    if (err?.status && err?.error) {
      return res.status(502).json({
        error: {
          message: err.error?.message ?? err.message ?? "Appearance analysis failed",
          status: 502
        }
      });
    }
    next(err);
  }
}
