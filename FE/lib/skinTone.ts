import { apiFetch } from "./api";

export type SkinTone = "light" | "medium" | "dark";

export interface SkinToneResult {
  path: string;
  tone: SkinTone;
  hex: string;
  rgb: { r: number; g: number; b: number };
  luminance: number;
  skinPixelRatio: number;
  method: "skin-filter" | "central-mean-fallback";
}

export async function detectSkinTone(path: string): Promise<SkinToneResult> {
  return apiFetch<SkinToneResult>("/skin-tone", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ path })
  });
}
