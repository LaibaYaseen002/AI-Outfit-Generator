import { randomUUID } from "crypto";
import { supabaseAdmin } from "../services/supabase.js";

const BUCKET = process.env.SUPABASE_BUCKET || "user-photos";
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];

function extFromMime(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export async function uploadPhoto(req, res, next) {
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

    const userId = req.user.id;
    const ext = extFromMime(req.file.mimetype);
    const path = `${userId}/${randomUUID()}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (uploadError) {
      return res.status(500).json({
        error: { message: `Upload failed: ${uploadError.message}`, status: 500 }
      });
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(path);

    res.status(201).json({
      url: publicUrlData.publicUrl,
      path,
      bucket: BUCKET,
      size: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (err) {
    next(err);
  }
}
