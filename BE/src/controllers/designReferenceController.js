import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../services/supabase.js";
import { analyzeDesignReference } from "../services/designAnalyze.js";

const TABLE = "design_references";
const BUCKET = process.env.SUPABASE_BUCKET || "user-photos";
const SIGNED_URL_TTL = 60 * 60;

const ALLOWED_TAGS = [
  "neck",
  "sleeves",
  "back",
  "front",
  "daman",
  "trouser",
  "dupatta",
  "embroidery",
  "fabric",
  "other"
];
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

function extFromMime(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

async function maybeSignedUrl(path) {
  if (!path) return null;
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (error) return null;
  return data?.signedUrl ?? null;
}

async function shapeWithUrl(row) {
  return { ...row, imageUrl: await maybeSignedUrl(row.image_path) };
}

// POST /api/design/references — multipart "image" + form field "tag"
export async function uploadReference(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: { message: "No file uploaded. Use field name 'image'.", status: 400 }
      });
    }
    if (!ALLOWED_MIME.includes(req.file.mimetype)) {
      return res.status(400).json({
        error: {
          message: `Unsupported file type: ${req.file.mimetype}. Allowed: jpeg, png, webp.`,
          status: 400
        }
      });
    }
    const tag = req.body?.tag;
    if (!ALLOWED_TAGS.includes(tag)) {
      return res.status(400).json({
        error: {
          message: `'tag' must be one of: ${ALLOWED_TAGS.join(", ")}`,
          status: 400
        }
      });
    }

    const userId = req.user.id;
    const ext = extFromMime(req.file.mimetype);
    const imagePath = `${userId}/design-refs/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(imagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });
    if (uploadError) {
      return res.status(500).json({
        error: { message: `Upload failed: ${uploadError.message}`, status: 500 }
      });
    }

    // Run analysis right after upload so /generate doesn't re-pay for it.
    // A failure here is non-fatal — the reference is still usable, just
    // without the structured vision hints.
    let analysis = null;
    try {
      analysis = await analyzeDesignReference(req.file.buffer, tag);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[design] analyze failed:", err);
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        user_id: userId,
        image_path: imagePath,
        tag,
        analysis
      })
      .select("*")
      .single();

    if (error) {
      // Best-effort cleanup so we don't leave an orphan storage object.
      await supabaseAdmin.storage.from(BUCKET).remove([imagePath]).catch(() => {});
      return res
        .status(500)
        .json({ error: { message: error.message, status: 500 } });
    }

    res.status(201).json(await shapeWithUrl(data));
  } catch (err) {
    next(err);
  }
}

// GET /api/design/references
export async function listReferences(req, res, next) {
  try {
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });
    if (error) {
      return res
        .status(500)
        .json({ error: { message: error.message, status: 500 } });
    }
    const items = await Promise.all((data ?? []).map(shapeWithUrl));
    res.json({ items });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/design/references/:id — also removes the storage object.
export async function deleteReference(req, res, next) {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .delete()
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("id, image_path")
      .maybeSingle();
    if (error) {
      return res
        .status(500)
        .json({ error: { message: error.message, status: 500 } });
    }
    if (!data) {
      return res
        .status(404)
        .json({ error: { message: "Reference not found", status: 404 } });
    }
    if (data.image_path) {
      try {
        await supabaseAdmin.storage.from(BUCKET).remove([data.image_path]);
      } catch (storageErr) {
        // eslint-disable-next-line no-console
        console.error("[design] storage delete failed:", storageErr);
      }
    }
    res.json({ id: data.id, deleted: true });
  } catch (err) {
    next(err);
  }
}

// Helper for the generate controller — pull a set of references by id and
// verify they belong to the user. Returns rows in the order requested.
export async function getReferencesForUser(userId, ids) {
  if (!Array.isArray(ids) || ids.length === 0) return [];
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .in("id", ids);
  if (error) throw error;
  const byId = new Map((data ?? []).map((r) => [r.id, r]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}
