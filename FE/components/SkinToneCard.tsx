"use client";

import { SkinToneResult } from "@/lib/skinTone";

const TONE_LABELS: Record<SkinToneResult["tone"], string> = {
  light: "Light",
  medium: "Medium",
  dark: "Deep"
};

const TONE_COPY: Record<SkinToneResult["tone"], string> = {
  light:
    "Soft pastels, cool blues, and clean whites tend to flatter lighter tones.",
  medium:
    "Warm earth tones, olive, terracotta, and rich jewel colors highlight medium tones beautifully.",
  dark:
    "Bold colors, bright whites, gold accents, and deep saturated hues pop against deeper tones."
};

export default function SkinToneCard({ result }: { result: SkinToneResult }) {
  return (
    <div className="card animate-fade-in-up">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold text-brand-800">
          Detected skin tone
        </h2>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-800">
          {TONE_LABELS[result.tone]}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <div
          className="h-20 w-20 shrink-0 rounded-full border-4 border-white shadow-brand ring-1 ring-black/5"
          style={{ backgroundColor: result.hex }}
          aria-label={`Skin tone swatch ${result.hex}`}
        />
        <div className="min-w-0">
          <p className="text-2xl font-semibold text-neutral-800">
            {TONE_LABELS[result.tone]}
          </p>
          <p className="font-mono text-sm text-neutral-500">
            {result.hex} · luminance {result.luminance}
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm text-neutral-600">{TONE_COPY[result.tone]}</p>

      {result.method === "central-mean-fallback" && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800 ring-1 ring-amber-100">
          Tip: a clearer, well-lit photo of your face will give a more accurate
          reading.
        </p>
      )}
    </div>
  );
}
