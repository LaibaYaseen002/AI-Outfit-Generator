// Lightweight per-tab state shared across the upload → occasion → result flow.
// Lives in sessionStorage so a refresh doesn't break things, but clears when the tab closes.

import type { SkinToneResult } from "./skinTone";
import type { UploadResult } from "./upload";
import type { AgeGroup, Gender } from "./appearance";
import type { WeatherSnapshot } from "./weather";
import type { Culture } from "./outfit";

const KEY = "outfit-flow-state-v1";

export interface FlowAppearance {
  gender: Gender;
  ageGroup: AgeGroup;
  confidence: number;
  // True when the user explicitly chose / confirmed via the override UI.
  overridden: boolean;
}

export interface FlowState {
  upload?: UploadResult;
  skinTone?: SkinToneResult;
  appearance?: FlowAppearance;
  weather?: WeatherSnapshot;
  culture?: Culture;
  occasion?: string;
  preferences?: {
    style?: string;
    colorsLike?: string[];
    colorsAvoid?: string[];
    notes?: string;
  };
}

export function getFlowState(): FlowState {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FlowState) : {};
  } catch {
    return {};
  }
}

export function setFlowState(patch: Partial<FlowState>): FlowState {
  const next = { ...getFlowState(), ...patch };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearFlowState() {
  sessionStorage.removeItem(KEY);
}
