import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "../services/supabase.js";
import { classifyWardrobeItem } from "../services/wardrobeClassify.js";

const TABLE = "wardrobe_items";
const BUCKET = process.env.SUPABASE_BUCKET || "user-photos";
const SIGNED_URL_TTL = 60 * 60; // 1 hour
const ALLOWED_CATEGORIES = [
  "top",
  "bottom",
  "footwear",
  "accessory",
  "outerwear"
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

async function shapeWithUrl(item) {
  return { ...item, imageUrl: await maybeSignedUrl(item.image_path) };
}

function isOwnedPath(path, userId) {
  return typeof path === "string" && path.split("/")[0] === userId;
}

function isHex(s) {
  return typeof s === "string" && /^#[0-9a-fA-F]{6}$/.test(s);
}

function sanitizeColors(value) {
  if (!Array.isArray(value)) return null;
  const out = value
    .filter(isHex)
    .map((c) => c.toLowerCase())
    .slice(0, 3);
  return out;
}

function sanitizeAttributes(value) {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) return null;
  const material =
    typeof value.material === "string" ? value.material.slice(0, 60) : null;
  const season =
    typeof value.season === "string" ? value.season.slice(0, 30) : null;
  const occasions = Array.isArray(value.occasions)
    ? value.occasions
        .filter((o) => typeof o === "string")
        .map((o) => o.slice(0, 30))
        .slice(0, 4)
    : [];
  const notes =
    typeof value.notes === "string" ? value.notes.slice(0, 240) : null;
  return { material, season, occasions, notes };
}

// POST /api/wardrobe/upload — multipart "image" field. Uploads the photo
// AND runs auto-classification. Returns the storage path + suggested
// fields. The FE then PATCHes / POSTs the final item record.
export async function uploadWardrobePhoto(req, res, next) {
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
    const path = `${userId}/wardrobe/${randomUUID()}.${ext}`;

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

    let suggestion = null;
    try {
      suggestion = await classifyWardrobeItem(req.file.buffer);
    } catch (err) {
      // Classification failure is non-fatal — user can fill in manually.
      // eslint-disable-next-line no-console
      console.error("[wardrobe] classify failed:", err);
    }

    const url = await maybeSignedUrl(path);

    res.status(201).json({
      path,
      imageUrl: url,
      bucket: BUCKET,
      suggestion
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/wardrobe/items — finalize an item record after upload.
export async function createItem(req, res, next) {
  try {
    const { path, category, name, colors, attributes } = req.body ?? {};

    if (!path || !isOwnedPath(path, req.user.id)) {
      return res.status(400).json({
        error: { message: "Body field 'path' is required and must belong to you", status: 400 }
      });
    }
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: {
          message: `'category' must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
          status: 400
        }
      });
    }
    if (typeof name !== "string" || !name.trim()) {
      return res
        .status(400)
        .json({ error: { message: "'name' is required", status: 400 } });
    }

    const cleanColors = sanitizeColors(colors) ?? [];
    const cleanAttributes = sanitizeAttributes(attributes);
    if (cleanAttributes === null) {
      return res
        .status(400)
        .json({ error: { message: "'attributes' must be an object", status: 400 } });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .insert({
        user_id: req.user.id,
        image_path: path,
        category,
        name: name.trim().slice(0, 60),
        colors: cleanColors,
        attributes: cleanAttributes
      })
      .select("*")
      .single();

    if (error) {
      return res
        .status(500)
        .json({ error: { message: error.message, status: 500 } });
    }

    res.status(201).json(await shapeWithUrl(data));
  } catch (err) {
    next(err);
  }
}

// GET /api/wardrobe/items?category=top
export async function listItems(req, res, next) {
  try {
    const categoryFilter =
      typeof req.query.category === "string" &&
      ALLOWED_CATEGORIES.includes(req.query.category)
        ? req.query.category
        : null;

    let query = supabaseAdmin
      .from(TABLE)
      .select("*")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false });

    if (categoryFilter) query = query.eq("category", categoryFilter);

    const { data, error } = await query;
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

// GET /api/wardrobe/items/:id
export async function getItem(req, res, next) {
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
        .json({ error: { message: "Item not found", status: 404 } });
    }
    res.json(await shapeWithUrl(data));
  } catch (err) {
    next(err);
  }
}

// PATCH /api/wardrobe/items/:id
export async function updateItem(req, res, next) {
  try {
    const { id } = req.params;
    const { category, name, colors, attributes } = req.body ?? {};

    const patch = {};
    if (category !== undefined) {
      if (!ALLOWED_CATEGORIES.includes(category)) {
        return res.status(400).json({
          error: {
            message: `'category' must be one of: ${ALLOWED_CATEGORIES.join(", ")}`,
            status: 400
          }
        });
      }
      patch.category = category;
    }
    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res
          .status(400)
          .json({ error: { message: "'name' must be a non-empty string", status: 400 } });
      }
      patch.name = name.trim().slice(0, 60);
    }
    if (colors !== undefined) {
      const clean = sanitizeColors(colors);
      if (clean === null) {
        return res
          .status(400)
          .json({ error: { message: "'colors' must be an array of #hex", status: 400 } });
      }
      patch.colors = clean;
    }
    if (attributes !== undefined) {
      const clean = sanitizeAttributes(attributes);
      if (clean === null) {
        return res
          .status(400)
          .json({ error: { message: "'attributes' must be an object", status: 400 } });
      }
      patch.attributes = clean;
    }

    if (Object.keys(patch).length === 0) {
      return res
        .status(400)
        .json({ error: { message: "No fields to update", status: 400 } });
    }

    const { data, error } = await supabaseAdmin
      .from(TABLE)
      .update(patch)
      .eq("id", id)
      .eq("user_id", req.user.id)
      .select("*")
      .maybeSingle();
    if (error) {
      return res
        .status(500)
        .json({ error: { message: error.message, status: 500 } });
    }
    if (!data) {
      return res
        .status(404)
        .json({ error: { message: "Item not found", status: 404 } });
    }
    res.json(await shapeWithUrl(data));
  } catch (err) {
    next(err);
  }
}

// DELETE /api/wardrobe/items/:id — also removes the storage object.
export async function deleteItem(req, res, next) {
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
        .json({ error: { message: "Item not found", status: 404 } });
    }

    if (data.image_path) {
      // Best-effort cleanup; ignore failure so the row delete still succeeds.
      try {
        await supabaseAdmin.storage.from(BUCKET).remove([data.image_path]);
      } catch (storageErr) {
        // eslint-disable-next-line no-console
        console.error("[wardrobe] storage delete failed:", storageErr);
      }
    }

    res.json({ id: data.id, deleted: true });
  } catch (err) {
    next(err);
  }
}

// Helper used by outfit generation — fetches and projects items as a
// compact catalog the LLM can pick from. Not exposed via HTTP directly.
export async function getWardrobeCatalog(userId) {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select("id, image_path, category, name, colors, attributes")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
