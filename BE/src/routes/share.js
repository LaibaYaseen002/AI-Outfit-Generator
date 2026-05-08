import { Router } from "express";
import { getPublicShare } from "../controllers/shareController.js";

// Public router — no requireAuth. Mounted at /api/share.
// The token itself (32 random bytes, base64url) is the bearer credential.
const router = Router();

router.get("/:token", getPublicShare);

export default router;
