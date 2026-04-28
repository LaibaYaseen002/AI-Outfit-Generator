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
    <div className="rounded-2xl bg-white p-6 shadow-lg">
      <h2 className="text-xl font-bold text-brand-700">
        Detected skin tone
      </h2>
      <div className="mt-4 flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-full border-2 border-white shadow-md"
          style={{ backgroundColor: result.hex }}
          aria-label={`Skin tone swatch ${result.hex}`}
        />
        <div>
          <p className="text-2xl font-semibold text-neutral-800">
            {TONE_LABELS[result.tone]}
          </p>
          <p className="text-sm text-neutral-500">
            {result.hex} · luminance {result.luminance}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm text-neutral-600">{TONE_COPY[result.tone]}</p>
      {result.method === "central-mean-fallback" && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Tip: a clearer, well-lit photo of your face will give a more accurate
          reading.
        </p>
      )}
    </div>
  );
}
