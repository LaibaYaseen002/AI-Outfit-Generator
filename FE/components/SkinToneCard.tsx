"use client";

import { SkinTone, SkinToneResult } from "@/lib/skinTone";

const TONE_LABELS: Record<SkinTone, string> = {
  light: "Light",
  medium: "Medium",
  dark: "Deep"
};

const TONE_COPY: Record<SkinTone, string> = {
  light:
    "Soft pastels, cool blues, and clean whites tend to flatter lighter tones.",
  medium:
    "Warm earth tones, olive, terracotta, and rich jewel colors highlight medium tones beautifully.",
  dark:
    "Bold colors, bright whites, gold accents, and deep saturated hues pop against deeper tones."
};

// Representative swatch for each bucket — used when the user overrides.
const TONE_SWATCH: Record<SkinTone, string> = {
  light: "#EAC8A8",
  medium: "#A87C5A",
  dark: "#5C3A24"
};

const TONE_ORDER: SkinTone[] = ["light", "medium", "dark"];

interface Props {
  result: SkinToneResult;
  overridden?: boolean;
  onChange?: (next: SkinTone) => void;
}

export default function SkinToneCard({ result, overridden, onChange }: Props) {
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

      {onChange && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">
            Not right? Pick your tone
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {TONE_ORDER.map((t) => {
              const selected = result.tone === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onChange(t)}
                  aria-pressed={selected}
                  className={`flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-medium transition ${
                    selected
                      ? "border-brand-600 bg-brand-50 text-brand-800"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-brand-300 hover:bg-brand-50/40"
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: TONE_SWATCH[t] }}
                  />
                  {TONE_LABELS[t]}
                </button>
              );
            })}
          </div>
          {overridden && (
            <p className="mt-2 text-xs text-neutral-500">
              Manual override applied — outfit will use your selected tone.
            </p>
          )}
        </div>
      )}

      {result.method === "central-mean-fallback" && !overridden && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800 ring-1 ring-amber-100">
          Tip: a clearer, well-lit photo of your face will give a more accurate
          reading.
        </p>
      )}
    </div>
  );
}
