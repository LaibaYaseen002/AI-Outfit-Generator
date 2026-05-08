"use client";

import { useEffect, useState } from "react";
import {
  type OutfitItemRefs
} from "@/lib/outfit";
import {
  type WardrobeItem,
  listWardrobeItems
} from "@/lib/wardrobe";

interface Props {
  refs: OutfitItemRefs;
  className?: string;
}

interface Slot {
  label: string;
  ids: string[];
}

export default function WardrobeOutfitCard({ refs, className = "" }: Props) {
  const [items, setItems] = useState<WardrobeItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listWardrobeItems()
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to load wardrobe");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = new Map((items ?? []).map((it) => [it.id, it]));

  const slots: Slot[] = [
    { label: "Top", ids: refs.top ? [refs.top] : [] },
    { label: "Bottom", ids: refs.bottom ? [refs.bottom] : [] },
    { label: "Footwear", ids: refs.footwear ? [refs.footwear] : [] },
    { label: "Accessories", ids: refs.accessories ?? [] }
  ].filter((s) => s.ids.length > 0);

  if (slots.length === 0) return null;

  return (
    <section
      className={`card ${className}`}
      aria-label="Items from your wardrobe"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-brand-800">
          From your wardrobe
        </h2>
        <span className="text-xs text-neutral-500">Wardrobe-only mode</span>
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-red-100">
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {slots.flatMap((slot) =>
          slot.ids.map((id) => {
            const item = byId.get(id);
            return (
              <div
                key={id}
                className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5"
              >
                <div className="aspect-square w-full bg-brand-gradient-soft">
                  {item?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : items === null ? (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                      …
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                      removed
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    {slot.label}
                  </p>
                  <p className="truncate text-sm font-semibold text-neutral-800">
                    {item?.name ?? "Item no longer in wardrobe"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
