import { apiFetch } from "./api";

export type PreviewStatus =
  | "idle"
  | "pending"
  | "generating"
  | "ready"
  | "failed";

export interface OutfitPreview {
  id: string;
  status: PreviewStatus;
  imagePath: string | null;
  imageUrl: string | null;
  error: string | null;
  updatedAt: string | null;
}

export async function startOutfitPreview(id: string): Promise<OutfitPreview> {
  return apiFetch<OutfitPreview>(`/outfit/${id}/preview`, {
    method: "POST",
    auth: true
  });
}

export async function getOutfitPreview(id: string): Promise<OutfitPreview> {
  return apiFetch<OutfitPreview>(`/outfit/${id}/preview`, { auth: true });
}

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
  onUpdate?: (p: OutfitPreview) => void;
  signal?: AbortSignal;
}

export async function pollOutfitPreview(
  id: string,
  options: PollOptions = {}
): Promise<OutfitPreview> {
  const interval = options.intervalMs ?? 3000;
  const deadline = Date.now() + (options.timeoutMs ?? 120_000);

  while (true) {
    if (options.signal?.aborted) throw new Error("Polling cancelled");

    const preview = await getOutfitPreview(id);
    options.onUpdate?.(preview);

    if (preview.status === "ready" || preview.status === "failed") {
      return preview;
    }
    if (Date.now() > deadline) {
      return { ...preview, status: "failed", error: "Generation timed out" };
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
