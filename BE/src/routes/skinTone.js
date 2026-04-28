import { Router } from "express";
import { analyzeSkinTone } from "../controllers/skinToneController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

router.post("/", requireAuth, analyzeSkinTone);

export default router;
