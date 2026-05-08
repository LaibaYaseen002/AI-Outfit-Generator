import { Router } from "express";
import multer from "multer";
import {
  uploadWardrobePhoto,
  createItem,
  listItems,
  getItem,
  updateItem,
  deleteItem
} from "../controllers/wardrobeController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

function handleMulterError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res
      .status(status)
      .json({ error: { message: err.message, status, code: err.code } });
  }
  next(err);
}

router.post(
  "/upload",
  requireAuth,
  upload.single("image"),
  handleMulterError,
  uploadWardrobePhoto
);
router.post("/items", requireAuth, createItem);
router.get("/items", requireAuth, listItems);
router.get("/items/:id", requireAuth, getItem);
router.patch("/items/:id", requireAuth, updateItem);
router.delete("/items/:id", requireAuth, deleteItem);

export default router;
