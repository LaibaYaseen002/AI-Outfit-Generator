import { apiFetch } from "./api";
import type { SkinTone } from "./skinTone";

export interface Outfit {
  top: string;
  bottom: string;
  footwear: string;
  accessories: string[];
}

export interface OutfitResponse {
  outfit: Outfit;
  colors: string[];
  explanation: string;
  skinTone: SkinTone;
  occasion: string;
  model: string;
}

export interface GenerateOutfitInput {
  skinTone: SkinTone;
  skinHex?: string;
  occasion: string;
  preferences?: {
    style?: string;
    colorsLike?: string[];
    colorsAvoid?: string[];
    notes?: string;
  };
}

export async function generateOutfit(
  input: GenerateOutfitInput
): Promise<OutfitResponse> {
  return apiFetch<OutfitResponse>("/outfit/generate", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input)
  });
}
