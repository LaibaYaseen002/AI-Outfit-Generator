"use client";

import { useState } from "react";
import {
  geocode,
  getWeather,
  weatherEmoji,
  weatherSummary,
  GeocodeResult,
  WeatherSnapshot
} from "@/lib/weather";

interface Props {
  value: WeatherSnapshot | null;
  onChange: (next: WeatherSnapshot | null) => void;
}

type Mode = "off" | "loading" | "ready" | "error";

const todayIso = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

const maxDateIso = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};

export default function WeatherCard({ value, onChange }: Props) {
  const [mode, setMode] = useState<Mode>(value ? "ready" : "off");
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>(value?.date ?? todayIso());

  const [city, setCity] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GeocodeResult[] | null>(null);

  function fail(message: string) {
    setError(message);
    setMode("error");
  }

  async function fetchFor({
    lat,
    lon,
    locationLabel
  }: {
    lat: number;
    lon: number;
    locationLabel?: string | null;
  }) {
    setMode("loading");
    setError(null);
    try {
      const snap = await getWeather({
        lat,
        lon,
        date: date && date !== todayIso() ? date : null,
        locationLabel: locationLabel ?? null
      });
      onChange(snap);
      setMode("ready");
    } catch (err) {
      onChange(null);
      fail(err instanceof Error ? err.message : "Failed to fetch weather");
    }
  }

  function useGeolocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      fail("Geolocation is not available in this browser");
      return;
    }
    setMode("loading");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        fetchFor({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          locationLabel: null
        }),
      (geoErr) => {
        fail(
          geoErr.code === geoErr.PERMISSION_DENIED
            ? "Location permission denied. Try searching for a city instead."
            : "Couldn't read your location. Try searching for a city instead."
        );
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }

  async function searchCity(e: React.FormEvent) {
    e.preventDefault();
    if (city.trim().length < 2) return;
    setSearching(true);
    setSearchResults(null);
    setError(null);
    try {
      const results = await geocode(city.trim());
      setSearchResults(results);
      if (results.length === 0) setError("No matches — try a different name.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  function pickResult(r: GeocodeResult) {
    setSearchResults(null);
    setCity(r.label);
    fetchFor({
      lat: r.latitude,
      lon: r.longitude,
      locationLabel: r.label
    });
  }

  function disable() {
    onChange(null);
    setMode("off");
    setError(null);
    setSearchResults(null);
  }

  // Re-run with the new date if we already have a location
  async function handleDateChange(next: string) {
    setDate(next);
    if (value) {
      // Re-issue with the same coords inferred from the existing snapshot's
      // location label by re-geocoding — simplest reliable path.
      if (value.locationLabel) {
        const results = await geocode(value.locationLabel).catch(() => []);
        if (results[0]) {
          await fetchFor({
            lat: results[0].latitude,
            lon: results[0].longitude,
            locationLabel: results[0].label
          });
          return;
        }
      }
      // Fallback: just clear; the user will re-pick a location
      onChange(null);
      setMode("off");
    }
  }

  if (mode === "off" && !value) {
    return (
      <div className="card-flat">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-neutral-800">
              Adapt outfit to the weather?
            </p>
            <p className="mt-0.5 text-sm text-neutral-500">
              Optional — get a coat for cold days, breathable fabrics for hot
              ones, rain-friendly footwear, and so on.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMode("ready")}
            className="btn btn-sm btn-secondary"
          >
            Use weather
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card-flat space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-neutral-800">Weather</p>
        <button
          type="button"
          onClick={disable}
          className="btn btn-sm btn-ghost"
        >
          Disable
        </button>
      </div>

      {value && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-brand-gradient-soft px-4 py-3 ring-1 ring-black/5">
          <span className="text-2xl">{weatherEmoji(value)}</span>
          <div className="min-w-0">
            <p className="font-semibold text-neutral-800">
              {weatherSummary(value)}
            </p>
            <p className="text-xs text-neutral-500">
              {value.target === "forecast" && value.date
                ? `Forecast for ${value.date}`
                : "Current conditions"}
              {Number.isFinite(value.feelsLikeC ?? NaN)
                ? ` · feels ${Math.round(value.feelsLikeC as number)}°C`
                : ""}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Use my location</label>
          <button
            type="button"
            onClick={useGeolocation}
            disabled={mode === "loading"}
            className="btn btn-sm btn-secondary mt-2 w-full"
          >
            {mode === "loading" ? "Getting location…" : "📍 Detect"}
          </button>
        </div>
        <div>
          <label className="label">Or pick a date</label>
          <input
            type="date"
            min={todayIso()}
            max={maxDateIso()}
            value={date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <form onSubmit={searchCity} className="space-y-2">
        <label className="label">Search a city</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Lahore, London, Toronto"
            className="input"
          />
          <button
            type="submit"
            disabled={searching || city.trim().length < 2}
            className="btn btn-sm btn-primary shrink-0"
          >
            {searching ? "…" : "Search"}
          </button>
        </div>

        {searchResults && searchResults.length > 0 && (
          <ul className="divide-y divide-neutral-100 rounded-2xl bg-white ring-1 ring-black/5">
            {searchResults.map((r) => (
              <li key={`${r.latitude},${r.longitude},${r.label}`}>
                <button
                  type="button"
                  onClick={() => pickResult(r)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-brand-50"
                >
                  <span className="font-medium text-neutral-800">{r.label}</span>
                  <span className="text-xs text-neutral-500">
                    {r.latitude.toFixed(2)}, {r.longitude.toFixed(2)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </form>

      {error && (
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs text-amber-800 ring-1 ring-amber-100">
          {error}
        </p>
      )}
    </div>
  );
}
