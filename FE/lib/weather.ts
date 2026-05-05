import { apiFetch } from "./api";

export type WeatherCondition =
  | "clear"
  | "cloudy"
  | "rain"
  | "snow"
  | "thunder"
  | "fog";

export type TempBucket =
  | "freezing"
  | "cold"
  | "cool"
  | "mild"
  | "warm"
  | "hot";

export interface WeatherSnapshot {
  tempC: number;
  feelsLikeC: number | null;
  tempMinC: number | null;
  tempMaxC: number | null;
  condition: WeatherCondition;
  conditionLabel: string;
  bucket: TempBucket;
  windKph: number | null;
  precipitationMm: number | null;
  humidity: number | null;
  isDaytime: boolean | null;
  target: "current" | "forecast";
  date: string | null;
  locationLabel: string | null;
  timezone: string | null;
  provider: string;
  fetchedAt: string;
}

export interface GeocodeResult {
  name: string;
  country: string | null;
  admin1: string | null;
  latitude: number;
  longitude: number;
  timezone: string | null;
  label: string;
}

export async function getWeather(input: {
  lat: number;
  lon: number;
  date?: string | null;
  locationLabel?: string | null;
}): Promise<WeatherSnapshot> {
  return apiFetch<WeatherSnapshot>("/weather", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input)
  });
}

export async function geocode(query: string): Promise<GeocodeResult[]> {
  const { results } = await apiFetch<{ results: GeocodeResult[] }>(
    "/weather/geocode",
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ query })
    }
  );
  return results;
}

const CONDITION_EMOJI: Record<WeatherCondition, string> = {
  clear: "☀️",
  cloudy: "☁️",
  rain: "🌧️",
  snow: "❄️",
  thunder: "⛈️",
  fog: "🌫️"
};

export function weatherEmoji(w: Pick<WeatherSnapshot, "condition" | "isDaytime">) {
  if (w.condition === "clear" && w.isDaytime === false) return "🌙";
  return CONDITION_EMOJI[w.condition] ?? "🌡️";
}

export function weatherSummary(w: WeatherSnapshot): string {
  const parts: string[] = [];
  parts.push(`${Math.round(w.tempC)}°C`);
  if (w.conditionLabel) parts.push(w.conditionLabel);
  if (w.locationLabel) parts.push(w.locationLabel);
  return parts.join(" · ");
}
