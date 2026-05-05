import { Router } from "express";
import { postWeather, postGeocode } from "../controllers/weatherController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Both endpoints sit behind requireAuth so unauthenticated traffic can't
// drive Open-Meteo through us. The provider has no per-key billing, but
// keeping it gated is the safer default.
router.post("/", requireAuth, postWeather);
router.post("/geocode", requireAuth, postGeocode);

export default router;
