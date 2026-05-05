import { getAccessToken } from "./auth";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000/api";

interface ApiOptions extends RequestInit {
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {})
  };

  if (options.auth) {
    const token = await getAccessToken();
    if (!token) throw new ApiError("Not authenticated", 401);
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    let code: string | undefined;
    let details: unknown;
    try {
      const body = await res.json();
      message = body?.error?.message || message;
      code = body?.error?.code;
      details = body?.error?.details;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, code, details);
  }

  return (await res.json()) as T;
}
