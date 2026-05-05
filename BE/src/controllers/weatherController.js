import {
  getWeather,
  geocodeCity,
  WeatherHttpError
} from "../services/weather.js";

function sendUpstreamError(res, err) {
  if (err instanceof WeatherHttpError) {
    return res
      .status(err.status)
      .json({ error: { message: err.message, status: err.status } });
  }
  return null;
}

export async function postWeather(req, res, next) {
  try {
    const { lat, lon, date, locationLabel } = req.body ?? {};

    const result = await getWeather({
      lat: Number(lat),
      lon: Number(lon),
      date: date ?? null,
      locationLabel: typeof locationLabel === "string" ? locationLabel : null
    });

    res.json(result);
  } catch (err) {
    const handled = sendUpstreamError(res, err);
    if (handled) return;
    next(err);
  }
}

export async function postGeocode(req, res, next) {
  try {
    const { query } = req.body ?? {};
    const results = await geocodeCity(query);
    res.json({ results });
  } catch (err) {
    const handled = sendUpstreamError(res, err);
    if (handled) return;
    next(err);
  }
}
