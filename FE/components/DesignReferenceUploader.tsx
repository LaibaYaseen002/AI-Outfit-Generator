"use client";

import { useRef, useState } from "react";
import {
  DesignReference,
  ReferenceTag,
  uploadDesignReference
} from "@/lib/design";

const TAG_OPTIONS: { id: ReferenceTag; label: string; emoji: string }[] = [
  { id: "neck", label: "Neck", emoji: "🧣" },
  { id: "sleeves", label: "Sleeves", emoji: "👔" },
  { id: "back", label: "Back", emoji: "🔙" },
  { id: "front", label: "Front", emoji: "👗" },
  { id: "daman", label: "Daman / border", emoji: "🌾" },
  { id: "trouser", label: "Trouser / shalwar", emoji: "👖" },
  { id: "dupatta", label: "Dupatta", emoji: "🧕" },
  { id: "embroidery", label: "Embroidery", emoji: "✨" },
  { id: "fabric", label: "Fabric", emoji: "🧵" },
  { id: "other", label: "Other", emoji: "📌" }
];

interface Props {
  onUploaded: (ref: DesignReference) => void;
  disabled?: boolean;
}

export default function DesignReferenceUploader({ onUploaded, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedTag, setStagedTag] = useState<ReferenceTag>("neck");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setError("Only JPEG, PNG, or WebP images are accepted.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      return;
    }
    setError(null);
    setStagedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!stagedFile) return;
    setUploading(true);
    setError(null);
    try {
      const ref = await uploadDesignReference(stagedFile, stagedTag);
      onUploaded(ref);
      // Reset staging for the next file.
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setStagedFile(null);
      setPreviewUrl(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (disabled) return;
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => {
          if (!disabled) inputRef.current?.click();
        }}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition ${
          dragging
            ? "border-brand-600 bg-brand-50"
            : "border-neutral-300 bg-neutral-50 hover:border-brand-300 hover:bg-brand-50/40"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="reference preview"
            className="mx-auto max-h-48 rounded-xl object-contain"
          />
        ) : (
          <>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl">
              📷
            </div>
            <p className="font-semibold text-neutral-800">
              Drop a design reference here
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              or click to browse — JPEG / PNG / WebP up to 5 MB
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      {stagedFile && (
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              What part of the outfit is this?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TAG_OPTIONS.map((t) => {
                const selected = stagedTag === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setStagedTag(t.id)}
                    className={`flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-medium transition ${
                      selected
                        ? "border-brand-600 bg-brand-50 text-brand-800"
                        : "border-neutral-200 bg-white text-neutral-700 hover:border-brand-300"
                    }`}
                  >
                    <span aria-hidden>{t.emoji}</span>
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setStagedFile(null);
                setPreviewUrl(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={uploading}
              className="btn btn-sm btn-ghost"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn btn-sm btn-primary"
            >
              {uploading ? "Analyzing…" : "Add reference"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}
    </div>
  );
}

export { TAG_OPTIONS };
