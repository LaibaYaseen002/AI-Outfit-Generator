"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import HistoryThumb from "@/components/HistoryThumb";
import OutfitPreview from "@/components/OutfitPreview";
import FavoriteButton from "@/components/FavoriteButton";
import {
  HistoryItem,
  deleteHistoryItem,
  getHistoryItem
} from "@/lib/history";

const TONE_LABELS: Record<string, string> = {
  light: "Light",
  medium: "Medium",
  dark: "Deep"
};

export default function HistoryDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [item, setItem] = useState<HistoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getHistoryItem(id)
      .then((data) => {
        if (!cancelled) setItem(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleDelete() {
    if (!item || !confirm("Delete this saved outfit?")) return;
    setDeleting(true);
    try {
      await deleteHistoryItem(item.id);
      router.replace("/history");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
      setDeleting(false);
    }
  }

  return (
    <ProtectedRoute>
      <main className="page">
        <div className="container-narrow space-y-6 animate-fade-in-up">
          <div className="page-header">
            <Link href="/history" className="link-back">
              ← All history
            </Link>
            {item && (
              <div className="flex items-center gap-2">
                <FavoriteButton
                  id={item.id}
                  initial={item.is_favorite}
                  onChange={(next) =>
                    setItem((prev) =>
                      prev ? { ...prev, is_favorite: next } : prev
                    )
                  }
                  variant="chip"
                />
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="btn btn-sm btn-danger"
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}
          </div>

          {loading && (
            <div className="flex items-center gap-3 text-neutral-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700" />
              Loading…
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-50 px-5 py-4 text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          {item && (
            <>
              <OutfitPreview
                recommendationId={item.id}
                initial={
                  item.outfit_image_path && item.image_status === "ready"
                    ? {
                        id: item.id,
                        status: "ready",
                        imagePath: item.outfit_image_path,
                        imageUrl: null,
                        error: null,
                        updatedAt: item.image_updated_at
                      }
                    : undefined
                }
              />

              {item.image_path && (
                <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
                  <p className="px-6 pt-4 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Your reference photo
                  </p>
                  <div className="max-h-72 overflow-hidden">
                    <HistoryThumb userImagePath={item.image_path} />
                  </div>
                </div>
              )}

              <div className="card">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Skin tone · Occasion
                    </p>
                    <p className="font-semibold text-neutral-800">
                      {TONE_LABELS[item.skin_tone] ?? item.skin_tone} ·{" "}
                      <span className="capitalize">{item.occasion}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {item.colors.map((c) => (
                      <div
                        key={c}
                        title={c}
                        className="h-9 w-9 rounded-full border-2 border-white shadow-soft ring-1 ring-black/5"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <p className="mt-4 text-xs text-neutral-500">
                  Saved {new Date(item.created_at).toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailItem label="Top" value={item.outfit.top} />
                <DetailItem label="Bottom" value={item.outfit.bottom} />
                <DetailItem label="Footwear" value={item.outfit.footwear} />
                <div className="card-flat">
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Accessories
                  </p>
                  <ul className="mt-2 space-y-1 text-neutral-800">
                    {item.outfit.accessories.map((a, i) => (
                      <li key={i}>• {a}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="card">
                <h2 className="text-lg font-semibold text-brand-800">
                  Why this works
                </h2>
                <p className="mt-2 leading-relaxed text-neutral-700">
                  {item.explanation}
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-flat">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-neutral-800">{value}</p>
    </div>
  );
}
