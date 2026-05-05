import { Router } from "express";
import { postAnalyzeUser } from "../controllers/appearanceController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

router.post("/", requireAuth, postAnalyzeUser);

export default router;
