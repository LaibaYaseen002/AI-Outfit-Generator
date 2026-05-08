"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  CATEGORY_LABELS,
  WARDROBE_CATEGORIES,
  type WardrobeItem,
  deleteWardrobeItem,
  listWardrobeItems
} from "@/lib/wardrobe";

export default function WardrobePage() {
  const [items, setItems] = useState<WardrobeItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await listWardrobeItems();
      setItems(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load wardrobe");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Remove this item from your wardrobe?")) return;
    setDeletingId(id);
    try {
      await deleteWardrobeItem(id);
      setItems((prev) => (prev ? prev.filter((it) => it.id !== id) : prev));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = WARDROBE_CATEGORIES.map((cat) => ({
    category: cat,
    items: (items ?? []).filter((it) => it.category === cat)
  }));

  return (
    <ProtectedRoute>
      <main className="page">
        <div className="container-wide space-y-6 animate-fade-in-up">
          <div className="page-header">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
                My closet
              </p>
              <h1 className="page-title mt-1">Your wardrobe</h1>
              <p className="mt-1 text-sm text-neutral-600">
                Items you own. Turn on wardrobe-only mode on the occasion page
                to get outfits using just these.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard" className="btn btn-sm btn-ghost">
                ← Dashboard
              </Link>
              <Link href="/wardrobe/add" className="btn btn-sm btn-primary">
                + Add item
              </Link>
            </div>
          </div>

          {loading && items == null && (
            <div className="flex items-center gap-3 text-neutral-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
              Loading your wardrobe…
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 px-5 py-4 text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          {items != null && items.length === 0 && !loading && (
            <div className="card text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl">
                👕
              </div>
              <p className="mt-3 text-neutral-700">
                Your wardrobe is empty. Add a few items so the AI can build
                outfits using only what you own.
              </p>
              <Link href="/wardrobe/add" className="btn btn-md btn-primary mt-5">
                Add your first item
              </Link>
            </div>
          )}

          {items != null && items.length > 0 &&
            grouped.map(({ category, items: list }) =>
              list.length === 0 ? null : (
                <section key={category}>
                  <h2 className="mb-3 text-lg font-semibold text-neutral-800">
                    {CATEGORY_LABELS[category]}
                    <span className="ml-2 text-sm font-normal text-neutral-500">
                      ({list.length})
                    </span>
                  </h2>
                  <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {list.map((item) => (
                      <li
                        key={item.id}
                        className="group relative overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5"
                      >
                        <div className="aspect-square w-full bg-brand-gradient-soft">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-sm font-semibold text-neutral-800">
                            {item.name}
                          </p>
                          <div className="mt-1 flex items-center gap-1">
                            {item.colors.slice(0, 3).map((c) => (
                              <span
                                key={c}
                                title={c}
                                className="h-3 w-3 rounded-full border border-white shadow ring-1 ring-black/5"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            {item.attributes?.material && (
                              <span className="ml-1 truncate text-xs text-neutral-500">
                                {item.attributes.material}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-1 text-xs text-red-600 shadow ring-1 ring-black/5 backdrop-blur hover:bg-white"
                          aria-label="Delete"
                        >
                          {deletingId === item.id ? "…" : "✕"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
