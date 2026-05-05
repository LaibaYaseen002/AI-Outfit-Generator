import { Router } from "express";
import {
  listHistory,
  getHistoryItem,
  deleteHistoryItem,
  setFavorite
} from "../controllers/historyController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

router.get("/", requireAuth, listHistory);
router.get("/:id", requireAuth, getHistoryItem);
router.delete("/:id", requireAuth, deleteHistoryItem);
router.patch("/:id/favorite", requireAuth, setFavorite);

export default router;
