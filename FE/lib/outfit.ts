import { apiFetch } from "./api";
import type { SkinTone } from "./skinTone";
import type { AgeGroup, Gender } from "./appearance";
import type { WeatherSnapshot } from "./weather";

export interface Outfit {
  top: string;
  bottom: string;
  footwear: string;
  accessories: string[];
}

export interface OutfitResponse {
  id: string | null;
  outfit: Outfit;
  colors: string[];
  explanation: string;
  skinTone: SkinTone;
  occasion: string;
  gender: Gender | null;
  ageGroup: AgeGroup | null;
  weather: WeatherSnapshot | null;
  model: string;
}

export interface GenerateOutfitInput {
  skinTone: SkinTone;
  skinHex?: string;
  occasion: string;
  imagePath?: string;
  gender?: Gender;
  ageGroup?: AgeGroup;
  weather?: WeatherSnapshot;
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
