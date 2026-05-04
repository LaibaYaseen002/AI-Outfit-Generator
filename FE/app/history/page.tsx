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

  async function load(nextOffset: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await listHistory({ limit: PAGE_SIZE, offset: nextOffset });
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
  }, []);

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
      <main className="min-h-screen bg-brand-50 px-4 py-12">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-brand-700">Your history</h1>
            <Link
              href="/dashboard"
              className="text-sm text-brand-700 hover:underline"
            >
              ← Dashboard
            </Link>
          </div>

          {loading && items == null && (
            <p className="text-neutral-500">Loading your past outfits…</p>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 p-4 text-red-700">
              {error}
            </div>
          )}

          {items != null && items.length === 0 && !loading && (
            <div className="rounded-2xl bg-white p-10 text-center shadow">
              <p className="text-neutral-700">
                No outfits yet. Generate your first one to see it here.
              </p>
              <Link
                href="/upload"
                className="mt-5 inline-block rounded-full bg-brand-700 px-6 py-3 text-white shadow hover:bg-brand-500 transition"
              >
                Get started
              </Link>
            </div>
          )}

          {items != null && items.length > 0 && (
            <>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="group overflow-hidden rounded-2xl bg-white shadow hover:shadow-lg transition"
                  >
                    <Link href={`/history/${item.id}`} className="block">
                      <HistoryThumb
                        outfitImagePath={item.outfit_image_path}
                        userImagePath={item.image_path}
                      />
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs uppercase tracking-wide text-neutral-500">
                            {formatDate(item.created_at)}
                          </p>
                          <div className="flex gap-1">
                            {item.colors.slice(0, 3).map((c) => (
                              <span
                                key={c}
                                title={c}
                                className="h-4 w-4 rounded-full border border-white shadow"
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="mt-2 font-semibold capitalize text-neutral-800">
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
                    <div className="flex justify-end border-t border-neutral-100 p-2">
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="rounded-full px-3 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === item.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between pt-2">
                <button
                  onClick={() => load(Math.max(0, offset - PAGE_SIZE))}
                  disabled={!hasPrev || loading}
                  className="rounded-full border border-brand-700 px-5 py-2 text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
                >
                  ← Newer
                </button>
                <p className="text-sm text-neutral-500">
                  {offset + 1}–{offset + items.length} of {total}
                </p>
                <button
                  onClick={() => load(offset + PAGE_SIZE)}
                  disabled={!hasNext || loading}
                  className="rounded-full border border-brand-700 px-5 py-2 text-brand-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40 transition"
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
