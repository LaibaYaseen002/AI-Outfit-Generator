"use client";

import { useEffect, useRef, useState } from "react";
import {
  OutfitPreview as PreviewState,
  PreviewStatus,
  pollOutfitPreview,
  startOutfitPreview
} from "@/lib/preview";

interface Props {
  recommendationId: string;
  // Optional initial preview from a parent fetch — avoids a duplicate POST.
  initial?: PreviewState;
  className?: string;
}

const ACTIVE: PreviewStatus[] = ["idle", "pending", "generating"];

export default function OutfitPreview({
  recommendationId,
  initial,
  className = ""
}: Props) {
  const [preview, setPreview] = useState<PreviewState | null>(initial ?? null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const startedFor = useRef<string | null>(null);

  async function startAndPoll() {
    setError(null);
    try {
      // Always POST first — it's idempotent on the server.
      const started = await startOutfitPreview(recommendationId);
      setPreview(started);

      if (started.status === "ready" || started.status === "failed") return;

      const final = await pollOutfitPreview(recommendationId, {
        intervalMs: 3000,
        timeoutMs: 120_000,
        onUpdate: (p) => setPreview(p)
      });
      setPreview(final);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setRetrying(false);
    }
  }

  useEffect(() => {
    if (!recommendationId) return;
    if (startedFor.current === recommendationId) return;
    startedFor.current = recommendationId;

    // If we already have a ready preview from the parent, skip the POST.
    if (initial?.status === "ready" && initial.imageUrl) {
      setPreview(initial);
      return;
    }
    startAndPoll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recommendationId]);

  const status: PreviewStatus = preview?.status ?? "pending";
  const isActive = ACTIVE.includes(status);

  function handleRetry() {
    setRetrying(true);
    startedFor.current = null; // allow effect to re-run
    startedFor.current = recommendationId;
    startAndPoll();
  }

  return (
    <div
      className={`overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5 ${className}`}
    >
      <div className="relative aspect-[2/3] w-full bg-brand-gradient-soft">
        {status === "ready" && preview?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview.imageUrl}
            alt="Generated outfit on a model"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-8 text-center">
            {isActive && (
              <>
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
                <p className="text-sm font-semibold text-brand-800">
                  {status === "generating"
                    ? "Painting your outfit on a model…"
                    : "Starting visual preview…"}
                </p>
                <p className="text-xs text-neutral-500">
                  This usually takes 15–30 seconds.
                </p>
              </>
            )}
            {status === "failed" && (
              <>
                <div className="text-3xl">🖼️</div>
                <p className="text-sm font-semibold text-red-700">
                  Couldn&apos;t generate the preview image.
                </p>
                <p className="text-xs text-neutral-500">
                  {preview?.error ?? error ?? "Please try again."}
                </p>
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="btn btn-sm btn-primary mt-2"
                >
                  {retrying ? "Retrying…" : "Try again"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
