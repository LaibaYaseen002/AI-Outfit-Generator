import { apiFetch } from "./api";

export type Gender = "male" | "female";
export type AgeGroup = "child" | "teenager" | "adult";
export type AppearanceStatus = "ok" | "low_confidence";

export interface AppearanceResult {
  path: string;
  gender: Gender;
  ageGroup: AgeGroup;
  confidence: number;
  status: AppearanceStatus;
  reason?: string;
}

/**
 * Calls the BE appearance detector for the user's uploaded photo.
 * Throws an ApiError with code="NO_FACE_DETECTED" when no face is visible —
 * the FE handles that case by surfacing the "clear front-facing image" hint.
 */
export async function analyzeAppearance(
  path: string
): Promise<AppearanceResult> {
  return apiFetch<AppearanceResult>("/analyze-user", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ path })
  });
}
