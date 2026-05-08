"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import WeatherCard from "@/components/WeatherCard";
import { getFlowState, setFlowState } from "@/lib/flow";
import { generateOutfit } from "@/lib/outfit";
import { listWardrobeItems } from "@/lib/wardrobe";
import type { WeatherSnapshot } from "@/lib/weather";

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
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [wardrobeOnly, setWardrobeOnly] = useState(false);
  const [wardrobeCount, setWardrobeCount] = useState<number | null>(null);

  useEffect(() => {
    const state = getFlowState();
    if (!state.skinTone || !state.upload) {
      setHasUpload(false);
    } else {
      setHasUpload(true);
    }
    if (state.weather) setWeather(state.weather);
    listWardrobeItems()
      .then((res) => setWardrobeCount(res.items.length))
      .catch(() => setWardrobeCount(0));
  }, []);

  function handleWeatherChange(next: WeatherSnapshot | null) {
    setWeather(next);
    setFlowState({ weather: next ?? undefined });
  }

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
        imagePath: state.upload?.path,
        gender: state.appearance?.gender,
        ageGroup: state.appearance?.ageGroup,
        weather: state.weather ?? undefined,
        wardrobeOnly: wardrobeOnly || undefined,
        preferences
      });
      setFlowState({ ...getFlowState(), ...{} });
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
        <main className="page-center">
          <div className="card max-w-md text-center animate-fade-in-up">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-2xl">
              📸
            </div>
            <h1 className="mt-3 text-xl font-bold text-brand-800">
              Upload first
            </h1>
            <p className="mt-2 text-neutral-600">
              We need a photo to detect your skin tone before recommending an
              outfit.
            </p>
            <Link href="/upload" className="btn btn-md btn-primary mt-6">
              Go to upload
              <span aria-hidden>→</span>
            </Link>
          </div>
        </main>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <main className="page">
        <div className="container-narrow space-y-8 animate-fade-in-up">
          <div className="page-header">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-brand-500">
                Step 2 of 3
              </p>
              <h1 className="page-title mt-1">Where are you going?</h1>
            </div>
            <Link href="/upload" className="link-back">
              ← Back
            </Link>
          </div>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-neutral-800">
              Pick an occasion
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {OCCASIONS.map((o) => {
                const selected = occasion === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => setOccasion(o.id)}
                    className={`group flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                      selected
                        ? "border-brand-700 bg-brand-gradient-soft shadow-brand -translate-y-0.5"
                        : "border-transparent bg-white shadow-soft hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-brand"
                    }`}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-2xl shadow-inner-soft transition-transform group-hover:scale-110">
                      {o.emoji}
                    </span>
                    <span className="font-semibold text-neutral-800">
                      {o.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <WeatherCard value={weather} onChange={handleWeatherChange} />

          <section className="card flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-neutral-800">
                Use my wardrobe only
              </h2>
              <p className="mt-0.5 text-sm text-neutral-600">
                {wardrobeCount === null
                  ? "Loading your wardrobe…"
                  : wardrobeCount === 0
                  ? "Add items to your wardrobe to enable this."
                  : `Pick from your ${wardrobeCount} saved item${
                      wardrobeCount === 1 ? "" : "s"
                    } only.`}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={wardrobeOnly}
                  disabled={!wardrobeCount}
                  onChange={(e) => setWardrobeOnly(e.target.checked)}
                  className="h-5 w-5 accent-brand-700"
                />
                <span className="text-sm font-semibold text-brand-800">
                  {wardrobeOnly ? "On" : "Off"}
                </span>
              </label>
              <Link
                href="/wardrobe"
                className="text-xs font-semibold text-brand-700 hover:underline"
              >
                Manage wardrobe →
              </Link>
            </div>
          </section>

          <section className="card space-y-5">
            <h2 className="text-lg font-semibold text-neutral-800">
              Preferences{" "}
              <span className="text-sm font-normal text-neutral-500">
                (optional)
              </span>
            </h2>

            <div>
              <label className="label">Style</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {STYLES.map((s) => {
                  const selected = style === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStyle(selected ? "" : s)}
                      className={`btn btn-sm capitalize ${
                        selected ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">
                  Colors I like{" "}
                  <span className="font-normal text-neutral-500">
                    (comma-separated)
                  </span>
                </label>
                <input
                  type="text"
                  value={colorsLike}
                  onChange={(e) => setColorsLike(e.target.value)}
                  placeholder="navy, beige, olive"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Colors to avoid</label>
                <input
                  type="text"
                  value={colorsAvoid}
                  onChange={(e) => setColorsAvoid(e.target.value)}
                  placeholder="neon, pastel pink"
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="label">Anything else?</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. I prefer modest cuts, must include a jacket, etc."
                className="input"
              />
            </div>
          </section>

          {error && (
            <div className="rounded-2xl bg-red-50 px-5 py-4 text-red-700 ring-1 ring-red-100">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={submitting}
            className="btn btn-lg btn-primary btn-block"
          >
            {submitting ? "Crafting your outfit…" : "Generate Outfit ✨"}
          </button>
        </div>
      </main>
    </ProtectedRoute>
  );
}
