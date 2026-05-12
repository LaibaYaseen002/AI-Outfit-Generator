import { Router } from "express";
import {
  postGenerateDesign,
  getDesign,
  listDesigns,
  deleteDesign
} from "../controllers/designController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

router.post("/generate", requireAuth, postGenerateDesign);
router.get("/", requireAuth, listDesigns);
router.get("/:id", requireAuth, getDesign);
router.delete("/:id", requireAuth, deleteDesign);

export default router;
