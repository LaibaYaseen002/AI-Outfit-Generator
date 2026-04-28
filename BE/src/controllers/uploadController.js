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

export async function getSignedUrl(req, res, next) {
  try {
    const { path } = req.query;
    if (!path || typeof path !== "string") {
      return res
        .status(400)
        .json({ error: { message: "Query param 'path' is required", status: 400 } });
    }

    // Path must belong to the requesting user (first folder = userId)
    const ownerId = path.split("/")[0];
    if (ownerId !== req.user.id) {
      return res
        .status(403)
        .json({ error: { message: "Forbidden", status: 403 } });
    }

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60);

    if (error) {
      return res
        .status(500)
        .json({ error: { message: error.message, status: 500 } });
    }

    res.json({ url: data.signedUrl, path, expiresIn: 60 * 60 });
  } catch (err) {
    next(err);
  }
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

    // Private bucket — generate a signed URL (1 hour). For long-term display,
    // re-sign on demand using the stored `path`.
    const SIGNED_URL_TTL = 60 * 60; // seconds
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL);

    if (signedError) {
      return res.status(500).json({
        error: { message: `Could not sign URL: ${signedError.message}`, status: 500 }
      });
    }

    res.status(201).json({
      url: signed.signedUrl,
      path,
      bucket: BUCKET,
      size: req.file.size,
      mimeType: req.file.mimetype,
      expiresIn: SIGNED_URL_TTL
    });
  } catch (err) {
    next(err);
  }
}
