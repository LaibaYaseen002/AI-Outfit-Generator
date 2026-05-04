import { Router } from "express";
import { postGenerateOutfit } from "../controllers/outfitController.js";
import {
  postOutfitPreview,
  getOutfitPreview
} from "../controllers/outfitPreviewController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

router.post("/generate", requireAuth, postGenerateOutfit);
router.post("/:id/preview", requireAuth, postOutfitPreview);
router.get("/:id/preview", requireAuth, getOutfitPreview);

export default router;
