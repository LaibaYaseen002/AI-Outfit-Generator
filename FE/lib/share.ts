import { apiFetch, API_BASE_URL } from "./api";
import type { Outfit } from "./outfit";
import type { SkinTone } from "./skinTone";

export interface CreateShareResponse {
  id: string;
  token: string;
}

export interface RevokeShareResponse {
  id: string;
  revoked: true;
}

export interface PublicShare {
  token: string;
  outfit: Outfit;
  colors: string[];
  explanation: string;
  occasion: string;
  skinTone: SkinTone;
  imageUrl: string | null;
  createdAt: string;
}

export async function createShare(id: string): Promise<CreateShareResponse> {
  return apiFetch<CreateShareResponse>(`/history/${id}/share`, {
    method: "POST",
    auth: true
  });
}

export async function revokeShare(id: string): Promise<RevokeShareResponse> {
  return apiFetch<RevokeShareResponse>(`/history/${id}/share`, {
    method: "DELETE",
    auth: true
  });
}

// Public — no auth header. Used by the /share/[token] page; safe to call
// from server components since it doesn't touch Supabase auth.
export async function getPublicShare(token: string): Promise<PublicShare> {
  const res = await fetch(
    `${API_BASE_URL}/share/${encodeURIComponent(token)}`,
    { cache: "no-store" }
  );
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      message = body?.error?.message || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return (await res.json()) as PublicShare;
}

export function buildShareUrl(token: string): string {
  if (typeof window === "undefined") return `/share/${token}`;
  return `${window.location.origin}/share/${token}`;
}
