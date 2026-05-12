"use client";

import { DesignReference, deleteDesignReference } from "@/lib/design";
import { TAG_OPTIONS } from "./DesignReferenceUploader";

interface Props {
  reference: DesignReference;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function DesignReferenceCard({
  reference,
  selected,
  onToggleSelect,
  onDelete
}: Props) {
  const tagDef = TAG_OPTIONS.find((t) => t.id === reference.tag);
  const a = reference.analysis;

  async function handleDelete() {
    if (!confirm("Delete this reference?")) return;
    try {
      await deleteDesignReference(reference.id);
      onDelete(reference.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div
      onClick={() => onToggleSelect(reference.id)}
      className={`group cursor-pointer overflow-hidden rounded-2xl border-2 bg-white shadow-soft transition ${
        selected
          ? "border-brand-600 -translate-y-0.5 shadow-brand"
          : "border-transparent hover:border-brand-300"
      }`}
    >
      <div className="relative aspect-square bg-neutral-100">
        {reference.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reference.imageUrl}
            alt={reference.tag}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-400">
            no preview
          </div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-neutral-800 shadow-soft">
          <span aria-hidden>{tagDef?.emoji ?? "📌"}</span>
          {tagDef?.label ?? reference.tag}
        </span>
        {selected && (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white shadow-brand">
            ✓
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="absolute bottom-2 right-2 hidden rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-red-600 shadow-soft group-hover:block"
          aria-label="Delete reference"
        >
          Delete
        </button>
      </div>
      {a && (
        <div className="space-y-1 px-3 py-2 text-xs text-neutral-600">
          <p className="line-clamp-2 text-neutral-700">{a.summary}</p>
          <div className="flex items-center gap-1">
            {a.dominantColors.slice(0, 3).map((c) => (
              <span
                key={c}
                title={c}
                className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10"
                style={{ backgroundColor: c }}
              />
            ))}
            {a.culturalStyle && (
              <span className="ml-1 truncate text-[10px] uppercase tracking-wider text-neutral-500">
                {a.culturalStyle}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
