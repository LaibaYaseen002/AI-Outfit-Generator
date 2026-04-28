import { Router } from "express";
import multer from "multer";
import { uploadPhoto, getSignedUrl } from "../controllers/uploadController.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
});

// Multer error handler — returns clean JSON instead of HTML
function handleMulterError(err, _req, res, next) {
  if (err instanceof multer.MulterError) {
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    return res
      .status(status)
      .json({ error: { message: err.message, status, code: err.code } });
  }
  next(err);
}

router.post("/", requireAuth, upload.single("image"), handleMulterError, uploadPhoto);
router.get("/signed-url", requireAuth, getSignedUrl);

export default router;
