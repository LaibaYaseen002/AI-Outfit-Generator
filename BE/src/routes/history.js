import { Router } from "express";
import {
  listHistory,
  getHistoryItem,
  deleteHistoryItem,
  setFavorite
} from "../controllers/historyController.js";
import {
  createShare,
  revokeShare
} from "../controllers/shareController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

router.get("/", requireAuth, listHistory);
router.get("/:id", requireAuth, getHistoryItem);
router.delete("/:id", requireAuth, deleteHistoryItem);
router.patch("/:id/favorite", requireAuth, setFavorite);
router.post("/:id/share", requireAuth, createShare);
router.delete("/:id/share", requireAuth, revokeShare);

export default router;
