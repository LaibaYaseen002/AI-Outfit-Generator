import { Router } from "express";
import { postGenerateOutfit } from "../controllers/outfitController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

router.post("/generate", requireAuth, postGenerateOutfit);

export default router;
