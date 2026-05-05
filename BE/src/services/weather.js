// Open-Meteo client — no API key, no signup. Free for non-commercial use.
// Docs: https://open-meteo.com/en/docs  +  https://open-meteo.com/en/docs/geocoding-api

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";

const MAX_FORECAST_DAYS = 15;

// WMO weather codes → human label + outfit-relevant condition bucket.
// https://open-meteo.com/en/docs (see "weathercode" table)
const WMO = {
  0: ["Clear sky", "clear"],
  1: ["Mostly clear", "clear"],
  2: ["Partly cloudy", "cloudy"],
  3: ["Overcast", "cloudy"],
  45: ["Fog", "fog"],
  48: ["Depositing rime fog", "fog"],
  51: ["Light drizzle", "rain"],
  53: ["Moderate drizzle", "rain"],
  55: ["Dense drizzle", "rain"],
  56: ["Light freezing drizzle", "snow"],
  57: ["Dense freezing drizzle", "snow"],
  61: ["Light rain", "rain"],
  63: ["Moderate rain", "rain"],
  65: ["Heavy rain", "rain"],
  66: ["Light freezing rain", "snow"],
  67: ["Heavy freezing rain", "snow"],
  71: ["Light snow", "snow"],
  73: ["Moderate snow", "snow"],
  75: ["Heavy snow", "snow"],
  77: ["Snow grains", "snow"],
  80: ["Rain showers", "rain"],
  81: ["Heavy rain showers", "rain"],
  82: ["Violent rain showers", "rain"],
  85: ["Snow showers", "snow"],
  86: ["Heavy snow showers", "snow"],
  95: ["Thunderstorm", "thunder"],
  96: ["Thunderstorm with hail", "thunder"],
  99: ["Severe thunderstorm with hail", "thunder"]
};

/**
 * Map a temperature in °C to a coarse bucket the prompt can reason about.
 * Boundaries are tuned for outfit guidance, not meteorology.
 */
function tempBucket(tempC) {
  if (tempC <= 0) return "freezing";
  if (tempC <= 10) return "cold";
  if (tempC <= 17) return "cool";
  if (tempC <= 23) return "mild";
  if (tempC <= 29) return "warm";
  return "hot";
}

function describeWmo(code) {
  const entry = WMO[code];
  if (entry) return { label: entry[0], condition: entry[1] };
  return { label: "Unknown", condition: "clear" };
}

function isValidLat(n) {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}
function isValidLon(n) {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

function normalizeDate(input) {
  if (input == null || input === "") return null;
  const s = String(input);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new HttpError(400, "'date' must be a valid ISO date (YYYY-MM-DD)");
  }
  return d.toISOString().slice(0, 10);
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function fetchJson(url) {
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new HttpError(
      502,
      `Weather upstream unreachable: ${err instanceof Error ? err.message : "fetch failed"}`
    );
  }
  if (!res.ok) {
    let body = "";
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    throw new HttpError(
      502,
      `Weather upstream error (${res.status}): ${body.slice(0, 200) || res.statusText}`
    );
  }
  return res.json();
}

/**
 * Look up coordinates for a free-text place name (city, "City, Country", etc).
 * @returns {Promise<Array<{name, country, admin1, latitude, longitude, timezone}>>}
 */
export async function geocodeCity(query, { count = 5 } = {}) {
  if (!query || typeof query !== "string" || query.trim().length < 2) {
    throw new HttpError(400, "'query' must be a string of at least 2 characters");
  }
  const params = new URLSearchParams({
    name: query.trim(),
    count: String(Math.max(1, Math.min(10, count))),
    language: "en",
    format: "json"
  });
  const data = await fetchJson(`${GEOCODE_URL}?${params.toString()}`);
  const results = Array.isArray(data?.results) ? data.results : [];
  return results.map((r) => ({
    name: r.name,
    country: r.country ?? null,
    admin1: r.admin1 ?? null,
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone ?? null,
    label: [r.name, r.admin1, r.country].filter(Boolean).join(", ")
  }));
}

/**
 * Fetch weather for a coordinate, optionally targeting a future date.
 * If `date` is omitted, returns "current" weather. If provided, returns
 * the daily forecast for that ISO date (must be within ~15 days).
 *
 * @returns {Promise<{
 *   tempC: number,
 *   feelsLikeC: number|null,
 *   tempMinC: number|null,
 *   tempMaxC: number|null,
 *   condition: "clear"|"cloudy"|"rain"|"snow"|"thunder"|"fog",
 *   conditionLabel: string,
 *   bucket: "freezing"|"cold"|"cool"|"mild"|"warm"|"hot",
 *   windKph: number|null,
 *   precipitationMm: number|null,
 *   humidity: number|null,
 *   isDaytime: boolean|null,
 *   target: "current"|"forecast",
 *   date: string|null,
 *   locationLabel: string|null,
 *   timezone: string|null,
 *   provider: "open-meteo",
 *   fetchedAt: string
 * }>}
 */
export async function getWeather({ lat, lon, date = null, locationLabel = null } = {}) {
  if (!isValidLat(lat)) {
    throw new HttpError(400, "'lat' must be a number between -90 and 90");
  }
  if (!isValidLon(lon)) {
    throw new HttpError(400, "'lon' must be a number between -180 and 180");
  }

  const targetDate = normalizeDate(date);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  let mode;
  if (!targetDate || targetDate === todayStr) {
    mode = "current";
  } else {
    const dayDiff = Math.round(
      (new Date(targetDate).getTime() - today.getTime()) / 86400000
    );
    if (dayDiff < 0) {
      throw new HttpError(400, "'date' must not be in the past");
    }
    if (dayDiff > MAX_FORECAST_DAYS) {
      throw new HttpError(
        400,
        `'date' is too far in the future (max ${MAX_FORECAST_DAYS} days)`
      );
    }
    mode = "forecast";
  }

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    timezone: "auto"
  });

  if (mode === "current") {
    params.set(
      "current",
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day"
    );
  } else {
    params.set("start_date", targetDate);
    params.set("end_date", targetDate);
    params.set(
      "daily",
      "temperature_2m_max,temperature_2m_min,apparent_temperature_max,weather_code,wind_speed_10m_max,precipitation_sum"
    );
  }

  const data = await fetchJson(`${FORECAST_URL}?${params.toString()}`);

  let tempC;
  let feelsLikeC = null;
  let tempMinC = null;
  let tempMaxC = null;
  let humidity = null;
  let windKph = null;
  let precipitationMm = null;
  let isDaytime = null;
  let weatherCode;

  if (mode === "current") {
    const c = data?.current ?? {};
    tempC = Number(c.temperature_2m);
    feelsLikeC = Number.isFinite(c.apparent_temperature)
      ? Number(c.apparent_temperature)
      : null;
    humidity = Number.isFinite(c.relative_humidity_2m)
      ? Number(c.relative_humidity_2m)
      : null;
    windKph = Number.isFinite(c.wind_speed_10m) ? Number(c.wind_speed_10m) : null;
    precipitationMm = Number.isFinite(c.precipitation)
      ? Number(c.precipitation)
      : null;
    isDaytime = c.is_day === 1 ? true : c.is_day === 0 ? false : null;
    weatherCode = Number(c.weather_code);
  } else {
    const d = data?.daily ?? {};
    tempMinC = Number(d.temperature_2m_min?.[0]);
    tempMaxC = Number(d.temperature_2m_max?.[0]);
    feelsLikeC = Number.isFinite(d.apparent_temperature_max?.[0])
      ? Number(d.apparent_temperature_max[0])
      : null;
    windKph = Number.isFinite(d.wind_speed_10m_max?.[0])
      ? Number(d.wind_speed_10m_max[0])
      : null;
    precipitationMm = Number.isFinite(d.precipitation_sum?.[0])
      ? Number(d.precipitation_sum[0])
      : null;
    weatherCode = Number(d.weather_code?.[0]);
    // Daily endpoint doesn't return a single representative temperature;
    // use the midpoint of min/max for the bucket and prompt.
    if (Number.isFinite(tempMinC) && Number.isFinite(tempMaxC)) {
      tempC = (tempMinC + tempMaxC) / 2;
    } else if (Number.isFinite(tempMaxC)) {
      tempC = tempMaxC;
    }
  }

  if (!Number.isFinite(tempC) || !Number.isFinite(weatherCode)) {
    throw new HttpError(502, "Weather upstream returned an unexpected payload");
  }

  const { label, condition } = describeWmo(weatherCode);

  return {
    tempC: Number(tempC.toFixed(1)),
    feelsLikeC: feelsLikeC == null ? null : Number(feelsLikeC.toFixed(1)),
    tempMinC: tempMinC == null ? null : Number(tempMinC.toFixed(1)),
    tempMaxC: tempMaxC == null ? null : Number(tempMaxC.toFixed(1)),
    condition,
    conditionLabel: label,
    bucket: tempBucket(tempC),
    windKph: windKph == null ? null : Number(windKph.toFixed(1)),
    precipitationMm: precipitationMm == null ? null : Number(precipitationMm.toFixed(1)),
    humidity: humidity == null ? null : Math.round(humidity),
    isDaytime,
    target: mode,
    date: mode === "forecast" ? targetDate : todayStr,
    locationLabel: locationLabel ?? null,
    timezone: data?.timezone ?? null,
    provider: "open-meteo",
    fetchedAt: new Date().toISOString()
  };
}

export { HttpError as WeatherHttpError, MAX_FORECAST_DAYS };
