import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import uploadRouter from "./routes/upload.js";
import skinToneRouter from "./routes/skinTone.js";
import outfitRouter from "./routes/outfit.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Routes
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/skin-tone", skinToneRouter);
app.use("/api/outfit", outfitRouter);

// 404 + error handler (must be last)
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 AI Outfit Generator API running on http://localhost:${PORT}`);
});
