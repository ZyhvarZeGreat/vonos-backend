import { apiUrl } from "@/lib/api/client";

export type ApiHealth = {
  status: string;
  service: string;
  database: "connected" | "disconnected";
  cache?: {
    backend: string;
    keyCount: number;
    redisConfigured: boolean;
  };
};

/** Unauthenticated liveness probe — does not use apiFetch (no JWT). */
export async function getApiHealth(signal?: AbortSignal): Promise<ApiHealth> {
  const response = await fetch(apiUrl("/health"), {
    method: "GET",
    credentials: "omit",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Health check failed (${response.status})`);
  }
  return response.json() as Promise<ApiHealth>;
}
