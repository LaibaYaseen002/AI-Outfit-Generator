"use client";

import { useEffect, useState } from "react";
import { Design, getDesign } from "@/lib/design";

interface Props {
  initial: Design;
}

const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 180_000;

export default function DesignGenerationPreview({ initial }: Props) {
  const [design, setDesign] = useState<Design>(initial);

  useEffect(() => {
    if (design.status === "ready" || design.status === "failed") return;

    let cancelled = false;
    const startedAt = Date.now();

    async function tick() {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (cancelled) return;
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
          setDesign((prev) =>
            prev.status === "ready" || prev.status === "failed"
              ? prev
              : { ...prev, status: "failed", error: "Generation timed out" }
          );
          return;
        }
        try {
          const next = await getDesign(design.id);
          if (cancelled) return;
          setDesign(next);
          if (next.status === "ready" || next.status === "failed") return;
        } catch {
          // Transient errors — keep polling until timeout.
        }
      }
    }

    void tick();
    return () => {
      cancelled = true;
    };
    // We deliberately key the polling effect on the design id only — the
    // status inside `design` updates from within and re-running on every
    // status change would restart the loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design.id]);

  if (design.status === "ready" && design.outputUrl) {
    return (
      <div className="card">
        <div className="overflow-hidden rounded-2xl bg-neutral-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={design.outputUrl}
            alt="generated outfit"
            className="mx-auto w-full max-w-xl object-contain"
          />
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
          <span>Generated with {design.model ?? "image model"}</span>
          <a
            href={design.outputUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-700 hover:underline"
          >
            Open full size →
          </a>
        </div>
      </div>
    );
  }

  if (design.status === "failed") {
    return (
      <div className="rounded-2xl bg-red-50 px-5 py-4 text-red-700 ring-1 ring-red-100">
        <p className="font-semibold">Generation failed</p>
        <p className="mt-1 text-sm">{design.error ?? "Unknown error"}</p>
      </div>
    );
  }

  return (
    <div className="card-flat">
      <p className="font-medium text-neutral-700">Designing your outfit…</p>
      <p className="mt-1 text-xs text-neutral-500">
        Merging your references and rendering on a studio mannequin. This
        usually takes 10–30 seconds.
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full w-1/3 animate-pulse bg-brand-gradient" />
      </div>
    </div>
  );
}
