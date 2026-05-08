"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import UploadDropzone from "@/components/UploadDropzone";
import {
  CATEGORY_LABELS,
  WARDROBE_CATEGORIES,
  type WardrobeAttributes,
  type WardrobeCategory,
  type WardrobeUploadResponse,
  createWardrobeItem,
  uploadWardrobePhoto
} from "@/lib/wardrobe";

const SEASON_OPTIONS = [
  { id: "all-season", label: "All season" },
  { id: "summer", label: "Summer" },
  { id: "winter", label: "Winter" },
  { id: "spring-fall", label: "Spring / Fall" },
  { id: "rain", label: "Rain" }
];

export default function AddWardrobeItemPage() {
  const router = useRouter();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState<WardrobeUploadResponse | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<WardrobeCategory>("top");
  const [name, setName] = useState("");
  const [colorsText, setColorsText] = useState("");
  const [material, setMaterial] = useState("");
  const [season, setSeason] = useState<string>("");
  const [occasionsText, setOccasionsText] = useState("");
  const [notes, setNotes] = useState("");

  async function handleFileSelected(file: File) {
    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    try {
      const res = await uploadWardrobePhoto(file);
      setUploaded(res);
      // Pre-fill form from auto-classify suggestion when available.
      if (res.suggestion) {
        setCategory(res.suggestion.category);
        setName(res.suggestion.name);
        setColorsText(res.suggestion.colors.join(", "));
        if (res.suggestion.attributes?.material) {
          setMaterial(res.suggestion.attributes.material);
        }
        if (res.suggestion.attributes?.season) {
          setSeason(res.suggestion.attributes.season);
        }
        if (res.suggestion.attributes?.occasions?.length) {
          setOccasionsText(res.suggestion.attributes.occasions.join(", "));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!uploaded) {
      setError("Upload a photo first.");
      return;
    }
    if (!name.trim()) {
      setError("Give your item a short name.");
      return;
    }
    setSaving(true);
    setError(null);

    const colors = colorsText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((c) => (c.startsWith("#") ? c : `#${c}`))
      .filter((c) => /^#[0-9a-fA-F]{6}$/.test(c));

    const occasions = occasionsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const attributes: WardrobeAttributes = {
      material: material.trim() || null,
      season: season || null,
      occasions,
      notes: notes.trim() || null
    };

    try {
      await createWardrobeItem({
        path: uploaded.path,
        category,
        name: name.trim(),
        colors,
        attributes
      });
      router.push("/wardrobe");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute>
      <main className="page">
        <div className="container-narrow space-y-6 animate-fade-in-up">
          <div className="page-header">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
                Add to wardrobe
              </p>
              <h1 className="page-title mt-1">New item</h1>
            </div>
            <Link href="/wardrobe" className="link-back">
              ← All items
            </Link>
          </div>

          <UploadDropzone
            onFileSelected={handleFileSelected}
            disabled={uploading || saving}
            previewUrl={previewUrl}
          />

          {uploading && (
            <div className="flex items-center gap-3 text-sm text-neutral-600">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
              Uploading and identifying the item…
            </div>
          )}

          {uploaded && (
            <section className="card space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-800">
                  Item details
                </h2>
                {uploaded.suggestion && (
                  <p className="text-xs text-neutral-500">
                    Pre-filled by AI · confidence{" "}
                    {Math.round(uploaded.suggestion.confidence * 100)}%
                  </p>
                )}
              </div>

              <div>
                <label className="label">Category</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WARDROBE_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`btn btn-sm ${
                        category === cat ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      {CATEGORY_LABELS[cat]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. navy linen blazer"
                  className="input"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">
                    Colors{" "}
                    <span className="font-normal text-neutral-500">
                      (#hex, comma-separated)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={colorsText}
                    onChange={(e) => setColorsText(e.target.value)}
                    placeholder="#1f3a8a, #f5efe6"
                    className="input"
                  />
                </div>
                <div>
                  <label className="label">Material</label>
                  <input
                    type="text"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="cotton, linen, denim…"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="label">Season</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SEASON_OPTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSeason(season === s.id ? "" : s.id)}
                      className={`btn btn-sm ${
                        season === s.id ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">
                  Suitable occasions{" "}
                  <span className="font-normal text-neutral-500">
                    (comma-separated)
                  </span>
                </label>
                <input
                  type="text"
                  value={occasionsText}
                  onChange={(e) => setOccasionsText(e.target.value)}
                  placeholder="casual, dinner, office"
                  className="input"
                />
              </div>

              <div>
                <label className="label">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Anything else worth remembering"
                  className="input"
                />
              </div>

              {error && (
                <div className="rounded-2xl bg-red-50 px-5 py-4 text-red-700 ring-1 ring-red-100">
                  {error}
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-lg btn-primary btn-block"
              >
                {saving ? "Saving…" : "Add to wardrobe"}
              </button>
            </section>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
