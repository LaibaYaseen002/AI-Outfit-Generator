"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import HistoryThumb from "@/components/HistoryThumb";
import OutfitPreview from "@/components/OutfitPreview";
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
      <main className="min-h-screen bg-brand-50 px-4 py-12">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <Link
              href="/history"
              className="text-sm text-brand-700 hover:underline"
            >
              ← All history
            </Link>
            {item && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-full border border-red-300 px-4 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>

          {loading && <p className="text-neutral-500">Loading…</p>}

          {error && (
            <div className="rounded-2xl bg-red-50 p-4 text-red-700">
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
                        // Signed URL is fetched fresh inside the component when missing
                        imageUrl: null,
                        error: null,
                        updatedAt: item.image_updated_at
                      }
                    : undefined
                }
              />

              {item.image_path && (
                <div className="overflow-hidden rounded-2xl bg-white shadow">
                  <p className="px-6 pt-4 text-xs uppercase tracking-wide text-neutral-500">
                    Your reference photo
                  </p>
                  <div className="max-h-72 overflow-hidden">
                    <HistoryThumb userImagePath={item.image_path} />
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-2xl bg-white shadow-lg">
                <div className="p-6">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-neutral-500">
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
                          className="h-8 w-8 rounded-full border-2 border-white shadow"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-neutral-500">
                    Saved {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <DetailItem label="Top" value={item.outfit.top} />
                <DetailItem label="Bottom" value={item.outfit.bottom} />
                <DetailItem label="Footwear" value={item.outfit.footwear} />
                <div className="rounded-2xl bg-white p-5 shadow">
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Accessories
                  </p>
                  <ul className="mt-2 space-y-1 text-neutral-800">
                    {item.outfit.accessories.map((a, i) => (
                      <li key={i}>• {a}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow">
                <h2 className="text-lg font-semibold text-brand-700">
                  Why this works
                </h2>
                <p className="mt-2 text-neutral-700">{item.explanation}</p>
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
    <div className="rounded-2xl bg-white p-5 shadow">
      <p className="text-xs uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-neutral-800">{value}</p>
    </div>
  );
}
