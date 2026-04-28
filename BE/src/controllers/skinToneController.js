import { supabaseAdmin } from "../services/supabase.js";
import { detectSkinTone } from "../services/skinTone.js";

const BUCKET = process.env.SUPABASE_BUCKET || "user-photos";

export async function analyzeSkinTone(req, res, next) {
  try {
    const { path } = req.body ?? {};
    if (!path || typeof path !== "string") {
      return res
        .status(400)
        .json({ error: { message: "Body field 'path' is required", status: 400 } });
    }

    // Authorization: path must belong to the requesting user
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
    const result = await detectSkinTone(Buffer.from(arrayBuffer));

    res.json({ path, ...result });
  } catch (err) {
    next(err);
  }
}
