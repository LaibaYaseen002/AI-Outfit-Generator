"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Stepper from "@/components/Stepper";
import LoadingOverlay from "@/components/LoadingOverlay";
import { getFlowState, setFlowState } from "@/lib/flow";
import { generateOutfit } from "@/lib/outfit";

const OCCASIONS = [
  { id: "casual", label: "Casual", emoji: "🧢" },
  { id: "office", label: "Office / Work", emoji: "💼" },
  { id: "dinner", label: "Dinner Date", emoji: "🍷" },
  { id: "wedding", label: "Wedding", emoji: "💍" },
  { id: "mehndi", label: "Mehndi", emoji: "🌿" },
  { id: "party", label: "Party", emoji: "🎉" },
  { id: "gym", label: "Gym", emoji: "🏋️" },
  { id: "beach", label: "Beach", emoji: "🏖️" },
  { id: "formal", label: "Formal Event", emoji: "🎩" }
];

const STYLES = ["minimal", "classic", "bold", "streetwear", "boho"];

export default function OccasionPage() {
  const router = useRouter();
  const [hasUpload, setHasUpload] = useState<boolean | null>(null);
  const [occasion, setOccasion] = useState<string | null>(null);
  const [style, setStyle] = useState<string>("");
  const [colorsLike, setColorsLike] = useState("");
  const [colorsAvoid, setColorsAvoid] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = getFlowState();
    if (!state.skinTone || !state.upload) {
      setHasUpload(false);
    } else {
      setHasUpload(true);
    }
  }, []);

  async function handleGenerate() {
    if (!occasion) {
      setError("Please pick an occasion first.");
      return;
    }
    const state = getFlowState();
    if (!state.skinTone) {
      setError("Missing skin tone — please upload a photo first.");
      return;
    }

    setError(null);
    setSubmitting(true);

    const preferences = {
      style: style || undefined,
      colorsLike: colorsLike
        ? colorsLike.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      colorsAvoid: colorsAvoid
        ? colorsAvoid.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      notes: notes || undefined
    };

    setFlowState({ occasion, preferences });

    try {
      const result = await generateOutfit({
        skinTone: state.skinTone.tone,
        skinHex: state.skinTone.hex,
        occasion,
        preferences
      });
      setFlowState({ ...getFlowState(), ...{} });
      // Stash result for the result page
      sessionStorage.setItem("outfit-result-v1", JSON.stringify(result));
      router.push("/result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate outfit");
      setSubmitting(false);
    }
  }

  if (hasUpload === false) {
    return (
      <ProtectedRoute>
        <main className="flex min-h-screen items-center justify-center gradient-warm px-4">
          <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow animate-scale-in">
            <h1 className="text-xl font-bold text-brand-700">Upload first</h1>
            <p className="mt-2 text-neutral-600">
              We need a photo to detect your skin tone before recommending an
              outfit.
            </p>
            <Link
              href="/upload"
              className="mt-5 inline-block rounded-full bg-brand-700 px-6 py-3 text-white shadow hover:bg-brand-500 transition"
            >
              Go to upload
            </Link>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <LoadingOverlay open={submitting} />
      <main className="min-h-screen gradient-warm px-4 py-12">
        <div className="mx-auto w-full max-w-3xl space-y-8">
          <Stepper current="occasion" />

          <div className="flex items-center justify-between animate-fade-in-up">
            <h1 className="text-3xl font-bold text-brand-700">
              Where are you going?
            </h1>
            <Link
              href="/upload"
              className="text-sm text-brand-700 hover:underline"
            >
              ← Back
            </Link>
          </div>

          <section className="animate-fade-in-up">
            <h2 className="mb-3 text-lg font-semibold text-neutral-800">
              Pick an occasion
            </h2>
            <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3">
              {OCCASIONS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOccasion(o.id)}
                  className={`animate-fade-in-up rounded-2xl border-2 p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    occasion === o.id
                      ? "border-brand-700 bg-brand-100 shadow-md"
                      : "border-transparent bg-white hover:border-brand-500"
                  }`}
                >
                  <div className="text-2xl">{o.emoji}</div>
                  <div className="mt-2 font-medium text-neutral-800">
                    {o.label}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4 rounded-2xl bg-white p-6 shadow animate-fade-in-up">
            <h2 className="text-lg font-semibold text-neutral-800">
              Preferences <span className="text-sm text-neutral-500">(optional)</span>
            </h2>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Style
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {STYLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(style === s ? "" : s)}
                    className={`rounded-full border px-4 py-1 text-sm capitalize transition ${
                      style === s
                        ? "border-brand-700 bg-brand-700 text-white"
                        : "border-neutral-300 bg-white text-neutral-700 hover:border-brand-500"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Colors I like (comma-separated)
                </label>
                <input
                  type="text"
                  value={colorsLike}
                  onChange={(e) => setColorsLike(e.target.value)}
                  placeholder="navy, beige, olive"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Colors to avoid
                </label>
                <input
                  type="text"
                  value={colorsAvoid}
                  onChange={(e) => setColorsAvoid(e.target.value)}
                  placeholder="neon, pastel pink"
                  className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Anything else?
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. I prefer modest cuts, must include a jacket, etc."
                className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </section>

          {error && (
            <div className="rounded-2xl bg-red-50 p-4 text-red-700 animate-fade-in-up">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={submitting}
            className="w-full rounded-full bg-brand-700 py-4 text-lg font-medium text-white shadow transition-all duration-200 hover:bg-brand-500 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 animate-fade-in-up"
          >
            {submitting ? "Crafting your outfit…" : "Generate Outfit"}
          </button>
        </div>
      </main>
    </ProtectedRoute>
  );
}
