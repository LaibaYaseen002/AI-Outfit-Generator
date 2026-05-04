"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import { OutfitResponse } from "@/lib/outfit";
import { clearFlowState, getFlowState } from "@/lib/flow";

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
        <main className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
          <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
            <h1 className="text-xl font-bold text-brand-700">No result yet</h1>
            <p className="mt-2 text-neutral-600">
              Looks like you haven&apos;t generated an outfit. Start by
              uploading a photo.
            </p>
            <Link
              href="/upload"
              className="mt-5 inline-block rounded-full bg-brand-700 px-6 py-3 text-white shadow hover:bg-brand-500 transition"
            >
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
        <main className="flex min-h-screen items-center justify-center">
          <p className="text-neutral-500">Loading your outfit…</p>
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
      <main className="min-h-screen bg-brand-50 px-4 py-12">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-brand-700">
              Your outfit is ready
            </h1>
            <div className="flex gap-4 text-sm text-brand-700">
              <Link href="/history" className="hover:underline">
                History
              </Link>
              <Link href="/dashboard" className="hover:underline">
                Dashboard →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {skinHex && (
                  <div
                    className="h-10 w-10 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: skinHex }}
                  />
                )}
                <div>
                  <p className="text-xs uppercase tracking-wide text-neutral-500">
                    Skin tone · Occasion
                  </p>
                  <p className="font-semibold text-neutral-800">
                    {TONE_LABELS[result.skinTone] ?? result.skinTone} ·{" "}
                    <span className="capitalize">{result.occasion}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {result.colors.map((c) => (
                  <div
                    key={c}
                    title={c}
                    className="h-8 w-8 rounded-full border-2 border-white shadow"
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
            <div className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs uppercase tracking-wide text-neutral-500">
                Accessories
              </p>
              <ul className="mt-2 space-y-1 text-neutral-800">
                {result.outfit.accessories.map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-brand-700">
              Why this works
            </h2>
            <p className="mt-2 text-neutral-700">{result.explanation}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <Link
              href="/occasion"
              className="rounded-full border border-brand-700 px-6 py-3 text-center text-brand-700 hover:bg-brand-50 transition"
            >
              ← Try a different occasion
            </Link>
            <Link
              href="/upload"
              onClick={startOver}
              className="rounded-full bg-brand-700 px-6 py-3 text-center text-white shadow hover:bg-brand-500 transition"
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
    <div className="rounded-2xl bg-white p-5 shadow">
      <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-neutral-800">{value}</p>
    </div>
  );
}
