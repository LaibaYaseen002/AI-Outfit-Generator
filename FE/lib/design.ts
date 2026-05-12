import { API_BASE_URL, apiFetch } from "./api";
import { getAccessToken } from "./auth";

export type ReferenceTag =
  | "neck"
  | "sleeves"
  | "back"
  | "front"
  | "daman"
  | "trouser"
  | "dupatta"
  | "embroidery"
  | "fabric"
  | "other";

export interface ReferenceAnalysis {
  tag: ReferenceTag;
  dominantColors: string[];
  embroideryType: string | null;
  stitchingDensity: "light" | "medium" | "heavy" | "none";
  culturalStyle: string;
  summary: string;
  model: string;
}

export interface DesignReference {
  id: string;
  image_path: string;
  imageUrl: string | null;
  tag: ReferenceTag;
  analysis: ReferenceAnalysis | null;
  created_at: string;
}

export type DesignStatus = "pending" | "generating" | "ready" | "failed";

export interface DesignControls {
  color?: string;
  fabric?: string;
  sleeveLength?: string;
  shirtLength?: string;
  trouserStyle?: string;
  dupattaStyle?: string;
  fit?: string;
  embroideryDensity?: string;
  garmentCategory?: string;
  culturalStyle?: string;
}

export interface Design {
  id: string;
  referenceIds: string[];
  userPrompt: string;
  controls: DesignControls;
  builtPrompt: string;
  outputPath: string | null;
  outputUrl: string | null;
  status: DesignStatus;
  error: string | null;
  model: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function uploadDesignReference(
  file: File,
  tag: ReferenceTag
): Promise<DesignReference> {
  const token = await getAccessToken();
  if (!token) throw new Error("Not authenticated");
  const form = new FormData();
  form.append("image", file);
  form.append("tag", tag);
  const res = await fetch(`${API_BASE_URL}/design/references`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message ?? `Upload failed: ${res.status}`);
  }
  return body as DesignReference;
}

export async function listDesignReferences(): Promise<{
  items: DesignReference[];
}> {
  return apiFetch("/design/references", { method: "GET", auth: true });
}

export async function deleteDesignReference(id: string): Promise<void> {
  await apiFetch(`/design/references/${id}`, {
    method: "DELETE",
    auth: true
  });
}

export async function generateDesign(input: {
  referenceIds: string[];
  userPrompt: string;
  controls?: DesignControls;
}): Promise<Design> {
  return apiFetch<Design>("/design/generate", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input)
  });
}

export async function getDesign(id: string): Promise<Design> {
  return apiFetch<Design>(`/design/${id}`, { method: "GET", auth: true });
}

export async function listDesigns(): Promise<{ items: Design[] }> {
  return apiFetch("/design", { method: "GET", auth: true });
}

export async function deleteDesign(id: string): Promise<void> {
  await apiFetch(`/design/${id}`, { method: "DELETE", auth: true });
}
