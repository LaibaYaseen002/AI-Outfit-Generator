import { apiFetch } from "./api";
import type { Outfit } from "./outfit";
import type { PreviewStatus } from "./preview";
import type { SkinTone } from "./skinTone";

export interface HistoryItem {
  id: string;
  user_id: string;
  image_path: string | null;
  skin_tone: SkinTone;
  skin_hex: string | null;
  occasion: string;
  preferences: {
    style?: string;
    colorsLike?: string[];
    colorsAvoid?: string[];
    notes?: string;
  };
  outfit: Outfit;
  colors: string[];
  explanation: string;
  model: string | null;
  created_at: string;
  outfit_image_path: string | null;
  image_status: PreviewStatus;
  image_error: string | null;
  image_updated_at: string | null;
}

export interface HistoryListResponse {
  items: HistoryItem[];
  limit: number;
  offset: number;
  total: number;
}

export async function listHistory(
  params: { limit?: number; offset?: number } = {}
): Promise<HistoryListResponse> {
  const search = new URLSearchParams();
  if (params.limit != null) search.set("limit", String(params.limit));
  if (params.offset != null) search.set("offset", String(params.offset));
  const qs = search.toString();
  return apiFetch<HistoryListResponse>(`/history${qs ? `?${qs}` : ""}`, {
    auth: true
  });
}

export async function getHistoryItem(id: string): Promise<HistoryItem> {
  return apiFetch<HistoryItem>(`/history/${id}`, { auth: true });
}

export async function deleteHistoryItem(
  id: string
): Promise<{ id: string; deleted: true }> {
  return apiFetch<{ id: string; deleted: true }>(`/history/${id}`, {
    method: "DELETE",
    auth: true
  });
}

export interface SignedUrlResponse {
  url: string;
  path: string;
  expiresIn: number;
}

export async function getSignedUrl(path: string): Promise<SignedUrlResponse> {
  const qs = new URLSearchParams({ path }).toString();
  return apiFetch<SignedUrlResponse>(`/upload/signed-url?${qs}`, {
    auth: true
  });
}
