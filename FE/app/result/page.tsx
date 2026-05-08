"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { CULTURES, OutfitResponse } from "@/lib/outfit";
import { clearFlowState, getFlowState } from "@/lib/flow";
import OutfitPreview from "@/components/OutfitPreview";
import FavoriteButton from "@/components/FavoriteButton";
import ShareButton from "@/components/ShareButton";
import WardrobeOutfitCard from "@/components/WardrobeOutfitCard";
import { weatherEmoji, weatherSummary } from "@/lib/weather";

const TONE_LABELS: Record<string, string> = {
  light: "Light",
  medium: "Medium",
  dark: "Deep"
};

export default function ResultPage() {
  const [result, setResult] = useState<OutfitResponse | null>(null);
  const [skinHex, setSkinHex] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("outfit-result-v1");
    if (!raw) {
      setMissing(true);
      return;
    }
    try {
      setResult(JSON.parse(raw) as OutfitResponse);
    } catch {
      setMissing(true);
    }
    setSkinHex(getFlowState().skinTone?.hex ?? null);
  }, []);

  if (missing) {
    return (
      <ProtectedRoute>
        <main className="page-center">
          <div className="card max-w-md text-center animate-fade-in-up">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl">
              ✨
            </div>
            <h1 className="mt-3 text-xl font-bold text-brand-800">
              No result yet
            </h1>
            <p className="mt-2 text-neutral-600">
              Looks like you haven&apos;t generated an outfit. Start by
              uploading a photo.
            </p>
            <Link href="/upload" className="btn btn-md btn-primary mt-6">
              Start over
            </Link>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  if (!result) {
    return (
      <ProtectedRoute>
        <main className="page-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
            <p className="text-sm font-medium text-brand-700">
              Loading your outfit…
            </p>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  function startOver() {
    sessionStorage.removeItem("outfit-result-v1");
    clearFlowState();
  }

  return (
    <ProtectedRoute>
      <main className="page">
        <div className="container-narrow space-y-6 animate-fade-in-up">
          <div className="page-header">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
                Step 3 of 3
              </p>
              <h1 className="page-title mt-1">Your outfit is ready</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {result.id && (
                <FavoriteButton
                  id={result.id}
                  initial={result.is_favorite ?? false}
                  onChange={(next) =>
                    setResult((prev) =>
                      prev ? { ...prev, is_favorite: next } : prev
                    )
                  }
                  variant="chip"
                />
              )}
              {result.id && <ShareButton id={result.id} />}
              <Link href="/history" className="btn btn-sm btn-ghost">
                History
              </Link>
              <Link href="/dashboard" className="btn btn-sm btn-secondary">
                Dashboard →
              </Link>
            </div>
          </div>

          {result.id && <OutfitPreview recommendationId={result.id} />}

          {result.outfitItemRefs && (
            <WardrobeOutfitCard refs={result.outfitItemRefs} />
          )}

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {skinHex && (
                  <div
                    className="h-12 w-12 rounded-full border-4 border-white shadow-brand ring-1 ring-black/5"
                    style={{ backgroundColor: skinHex }}
                  />
                )}
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Skin tone · Occasion
                  </p>
                  <p className="font-semibold text-neutral-800">
                    {TONE_LABELS[result.skinTone] ?? result.skinTone} ·{" "}
                    <span className="capitalize">{result.occasion}</span>
                  </p>
                  {(result.gender || result.ageGroup) && (
                    <p className="mt-0.5 text-xs capitalize text-neutral-500">
                      {[result.ageGroup, result.gender].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  {result.culture && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-neutral-500">
                      <span aria-hidden>
                        {CULTURES.find((c) => c.id === result.culture)?.emoji ?? "🌐"}
                      </span>
                      <span className="capitalize">
                        {CULTURES.find((c) => c.id === result.culture)?.label ??
                          result.culture}{" "}
                        styling
                      </span>
                    </p>
                  )}
                  {result.weather && (
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-neutral-500">
                      <span aria-hidden>{weatherEmoji(result.weather)}</span>
                      {weatherSummary(result.weather)}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {result.colors.map((c) => (
                  <div
                    key={c}
                    title={c}
                    className="h-9 w-9 rounded-full border-2 border-white shadow-soft ring-1 ring-black/5"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <OutfitItem label="Top" value={result.outfit.top} />
            <OutfitItem label="Bottom" value={result.outfit.bottom} />
            <OutfitItem label="Footwear" value={result.outfit.footwear} />
            <div className="card-flat">
              <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                Accessories
              </p>
              <ul className="mt-2 space-y-1 text-neutral-800">
                {result.outfit.accessories.map((a, i) => (
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
              {result.explanation}
            </p>
          </div>

          <div className="flex flex-col-reverse items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <Link href="/occasion" className="btn btn-md btn-secondary">
              ← Try a different occasion
            </Link>
            <Link
              href="/upload"
              onClick={startOver}
              className="btn btn-md btn-primary"
            >
              Start over with a new photo
            </Link>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

function OutfitItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-flat">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </p>
      <p className="mt-1 text-neutral-800">{value}</p>
    </div>
  );
}
