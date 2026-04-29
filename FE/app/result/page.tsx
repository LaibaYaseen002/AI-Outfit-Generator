"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import Stepper from "@/components/Stepper";
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
        <main className="flex min-h-screen items-center justify-center gradient-warm px-4">
          <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow animate-scale-in">
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
      <main className="min-h-screen gradient-warm px-4 py-12">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <Stepper current="result" />

          <div className="flex items-center justify-between animate-fade-in-up">
            <h1 className="text-3xl font-bold text-brand-700">
              Your outfit is ready
            </h1>
            <Link
              href="/dashboard"
              className="text-sm text-brand-700 hover:underline"
            >
              Dashboard →
            </Link>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg animate-scale-in">
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
              <ColorPalette colors={result.colors} />
            </div>
          </div>

          <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-2">
            <OutfitItem label="Top" value={result.outfit.top} icon="👕" />
            <OutfitItem label="Bottom" value={result.outfit.bottom} icon="👖" />
            <OutfitItem label="Footwear" value={result.outfit.footwear} icon="👟" />
            <div className="animate-fade-in-up rounded-2xl bg-white p-5 shadow transition hover:shadow-md">
              <div className="flex items-center gap-2">
                <span className="text-lg">✨</span>
                <p className="text-xs uppercase tracking-wide text-neutral-500">
                  Accessories
                </p>
              </div>
              <ul className="mt-2 space-y-1 text-neutral-800">
                {result.outfit.accessories.map((a, i) => (
                  <li key={i}>• {a}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow animate-fade-in-up">
            <h2 className="text-lg font-semibold text-brand-700">
              Why this works
            </h2>
            <p className="mt-2 text-neutral-700">{result.explanation}</p>
          </div>

          <div className="flex flex-col gap-3 animate-fade-in-up sm:flex-row sm:justify-between">
            <Link
              href="/occasion"
              className="rounded-full border border-brand-700 px-6 py-3 text-center text-brand-700 transition hover:bg-brand-50"
            >
              ← Try a different occasion
            </Link>
            <Link
              href="/upload"
              onClick={startOver}
              className="rounded-full bg-brand-700 px-6 py-3 text-center text-white shadow transition-all duration-200 hover:bg-brand-500 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
            >
              Start over with a new photo
            </Link>
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

function OutfitItem({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: string;
}) {
  return (
    <div className="animate-fade-in-up rounded-2xl bg-white p-5 shadow transition hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
      </div>
      <p className="mt-1 text-neutral-800">{value}</p>
    </div>
  );
}

function ColorPalette({ colors }: { colors: string[] }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(c: string) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(c).then(() => {
      setCopied(c);
      window.setTimeout(() => setCopied((prev) => (prev === c ? null : prev)), 1200);
    });
  }

  return (
    <div className="flex items-center gap-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => copy(c)}
          title={copied === c ? "Copied!" : `Copy ${c}`}
          aria-label={`Color ${c}, click to copy`}
          className="h-9 w-9 rounded-full border-2 border-white shadow transition-transform duration-200 hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-brand-500"
          style={{ backgroundColor: c }}
        />
      ))}
    </div>
  );
}
