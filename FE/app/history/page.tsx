"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  HistoryItem,
  deleteHistoryItem,
  listHistory
} from "@/lib/history";
import HistoryThumb from "@/components/HistoryThumb";
import FavoriteButton from "@/components/FavoriteButton";

const PAGE_SIZE = 12;

const TONE_LABELS: Record<string, string> = {
  light: "Light",
  medium: "Medium",
  dark: "Deep"
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    return iso;
  }
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  async function load(nextOffset: number, favOnly = favoritesOnly) {
    setLoading(true);
    setError(null);
    try {
      const res = await listHistory({
        limit: PAGE_SIZE,
        offset: nextOffset,
        favorite: favOnly
      });
      setItems(res.items);
      setTotal(res.total);
      setOffset(res.offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleFavoritesOnly() {
    const next = !favoritesOnly;
    setFavoritesOnly(next);
    setOffset(0);
    load(0, next);
  }

  function handleFavoriteChange(id: string, isFavorite: boolean) {
    // Mutate the in-memory list so the heart stays in sync without refetch.
    setItems((prev) =>
      prev
        ? prev
            .map((it) => (it.id === id ? { ...it, is_favorite: isFavorite } : it))
            // If we're filtered to favorites only, drop items that just got
            // un-favorited so the list reflects the filter.
            .filter((it) => (favoritesOnly ? it.is_favorite : true))
        : prev
    );
    if (favoritesOnly && !isFavorite) {
      setTotal((t) => Math.max(0, t - 1));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this saved outfit?")) return;
    setDeletingId(id);
    try {
      await deleteHistoryItem(id);
      setItems((prev) => (prev ? prev.filter((it) => it.id !== id) : prev));
      setTotal((t) => Math.max(0, t - 1));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  }

  const hasPrev = offset > 0;
  const hasNext = items != null && offset + items.length < total;

  return (
    <ProtectedRoute>
      <main className="page">
        <div className="container-wide space-y-6 animate-fade-in-up">
          <div className="page-header">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
                Saved looks
              </p>
              <h1 className="page-title mt-1">Your history</h1>
            </div>
            <Link href="/dashboard" className="link-back">
              ← Dashboard
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleFavoritesOnly}
              aria-pressed={favoritesOnly}
              className={`btn btn-sm ${favoritesOnly ? "btn-primary" : "btn-secondary"}`}
            >
              <span aria-hidden className={favoritesOnly ? "text-rose-100" : "text-rose-500"}>
                ♥
              </span>
              {favoritesOnly ? "Showing favorites" : "Favorites only"}
            </button>
          </div>

          {loading && items == null && (
            <div className="flex items-center gap-3 text-neutral-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
              Loading your past outfits…
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
                {favoritesOnly ? "♡" : "👗"}
              </div>
              <p className="mt-3 text-neutral-700">
                {favoritesOnly
                  ? "No favorites yet. Tap the heart on any outfit to save it here."
                  : "No outfits yet. Generate your first one to see it here."}
              </p>
              {favoritesOnly ? (
                <button
                  onClick={toggleFavoritesOnly}
                  className="btn btn-md btn-secondary mt-5"
                >
                  Show all outfits
                </button>
              ) : (
                <Link href="/upload" className="btn btn-md btn-primary mt-5">
                  Get started
                  <span aria-hidden>→</span>
                </Link>
              )}
            </div>
          )}

          {items != null && items.length > 0 && (
            <>
              <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="group relative overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-brand"
                  >
                    <div className="absolute right-3 top-3 z-10">
                      <FavoriteButton
                        id={item.id}
                        initial={item.is_favorite}
                        onChange={(next) => handleFavoriteChange(item.id, next)}
                        variant="icon"
                      />
                    </div>
                    <Link href={`/history/${item.id}`} className="block">
                      <div className="overflow-hidden">
                        <div className="transition-transform duration-300 group-hover:scale-[1.03]">
                          <HistoryThumb
                            outfitImagePath={item.outfit_image_path}
                            userImagePath={item.image_path}
                          />
                        </div>
                      </div>
                      <div className="p-5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                            {formatDate(item.created_at)}
                          </p>
                          <div className="flex gap-1">
                            {item.colors.slice(0, 3).map((c) => (
                              <span
                                key={c}
                                title={c}
                                className="h-4 w-4 rounded-full border border-white shadow ring-1 ring-black/5"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-2 text-base font-semibold capitalize text-neutral-800">
                          {item.occasion}
                        </p>
                        <p className="text-sm text-neutral-600">
                          {TONE_LABELS[item.skin_tone] ?? item.skin_tone} tone
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-neutral-700">
                          {item.outfit.top} · {item.outfit.bottom}
                        </p>
                      </div>
                    </Link>
                    <div className="flex justify-end border-t border-neutral-100 px-3 py-2">
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50"
                      >
                        {deletingId === item.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
                  disabled={!hasPrev || loading}
                  className="btn btn-sm btn-secondary"
                >
                  ← Newer
                </button>
                <p className="text-sm text-neutral-500">
                  {offset + 1}–{offset + items.length} of {total}
                </p>
                <button
                  onClick={() => load(offset + PAGE_SIZE)}
                  disabled={!hasNext || loading}
                  className="btn btn-sm btn-secondary"
                >
                  Older →
                </button>
              </div>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
