import { API_BASE_URL, apiFetch } from "./api";
import { getAccessToken } from "./auth";

export type WardrobeCategory =
  | "top"
  | "bottom"
  | "footwear"
  | "accessory"
  | "outerwear";

export interface WardrobeAttributes {
  material?: string | null;
  season?: string | null;
  occasions?: string[];
  notes?: string | null;
}

export interface WardrobeItem {
  id: string;
  user_id: string;
  image_path: string;
  imageUrl: string | null;
  category: WardrobeCategory;
  name: string;
  colors: string[];
  attributes: WardrobeAttributes;
  created_at: string;
}

export interface WardrobeSuggestion {
  category: WardrobeCategory;
  name: string;
  colors: string[];
  attributes: WardrobeAttributes;
  confidence: number;
  reason: string;
}

export interface WardrobeUploadResponse {
  path: string;
  imageUrl: string | null;
  bucket: string;
  suggestion: WardrobeSuggestion | null;
}

export const WARDROBE_CATEGORIES: WardrobeCategory[] = [
  "top",
  "bottom",
  "outerwear",
  "footwear",
  "accessory"
];

export const CATEGORY_LABELS: Record<WardrobeCategory, string> = {
  top: "Top",
  bottom: "Bottom",
  footwear: "Footwear",
  outerwear: "Outerwear",
  accessory: "Accessory"
};

export async function uploadWardrobePhoto(
  file: File
): Promise<WardrobeUploadResponse> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${API_BASE_URL}/wardrobe/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Upload failed: ${res.status}`);
  }
  return body as WardrobeUploadResponse;
}

export interface CreateItemInput {
  path: string;
  category: WardrobeCategory;
  name: string;
  colors?: string[];
  attributes?: WardrobeAttributes;
}

export async function createWardrobeItem(
  input: CreateItemInput
): Promise<WardrobeItem> {
  return apiFetch<WardrobeItem>("/wardrobe/items", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input)
  });
}

export async function listWardrobeItems(
  params: { category?: WardrobeCategory } = {}
): Promise<{ items: WardrobeItem[] }> {
  const search = new URLSearchParams();
  if (params.category) search.set("category", params.category);
  const qs = search.toString();
  return apiFetch<{ items: WardrobeItem[] }>(
    `/wardrobe/items${qs ? `?${qs}` : ""}`,
    { auth: true }
  );
}

export async function getWardrobeItem(id: string): Promise<WardrobeItem> {
  return apiFetch<WardrobeItem>(`/wardrobe/items/${id}`, { auth: true });
}

export async function updateWardrobeItem(
  id: string,
  patch: Partial<CreateItemInput>
): Promise<WardrobeItem> {
  return apiFetch<WardrobeItem>(`/wardrobe/items/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(patch)
  });
}

export async function deleteWardrobeItem(
  id: string
): Promise<{ id: string; deleted: true }> {
  return apiFetch<{ id: string; deleted: true }>(`/wardrobe/items/${id}`, {
    method: "DELETE",
    auth: true
  });
}
