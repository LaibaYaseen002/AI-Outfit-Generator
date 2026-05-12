"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import DesignGenerationPreview from "@/components/DesignGenerationPreview";
import { Design, deleteDesign, getDesign } from "@/lib/design";

export default function DesignDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id;

  const [design, setDesign] = useState<Design | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getDesign(id)
      .then((d) => {
        if (!cancelled) setDesign(d);
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
    if (!design || !confirm("Delete this design?")) return;
    setDeleting(true);
    try {
      await deleteDesign(design.id);
      router.replace("/design");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <ProtectedRoute>
      <main className="page">
        <div className="container-narrow space-y-6 animate-fade-in-up">
          <div className="page-header">
            <Link href="/design" className="link-back">
              ← My designs
            </Link>
            {design && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="btn btn-sm btn-danger"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
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

          {design && (
            <>
              <DesignGenerationPreview initial={design} />

              <div className="card space-y-3">
                <h2 className="text-lg font-semibold text-brand-800">
                  Your description
                </h2>
                <p className="leading-relaxed text-neutral-700">
                  {design.userPrompt}
                </p>
                {Object.keys(design.controls).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {Object.entries(design.controls).map(([k, v]) => (
                      <span
                        key={k}
                        className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-100"
                      >
                        <span className="text-neutral-500">{k}:</span> {v}
                      </span>
                    ))}
                  </div>
                )}
                <p className="pt-2 text-xs text-neutral-500">
                  {design.referenceIds.length} reference
                  {design.referenceIds.length === 1 ? "" : "s"} ·{" "}
                  {new Date(design.createdAt).toLocaleString()}
                </p>
              </div>

              <Link
                href="/design/new"
                className="btn btn-md btn-secondary"
              >
                Start a new design
              </Link>
            </>
          )}
        </div>
      </main>
    </ProtectedRoute>
  );
}
