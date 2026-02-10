import { getAccessToken } from "@/lib/auth";
import type { ApiResponse } from "@/types/api";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

/** Error thrown when the API returns an error envelope. */
export class ApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

/**
 * Core fetch wrapper.
 * - Prepends the API base URL
 * - Attaches the Bearer token (if present)
 * - Unwraps the { data, error } envelope
 * - Throws ApiError on error responses
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle non-JSON error responses (e.g. 500 from proxy)
  const contentType = res.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new ApiError(
      `Server error: ${res.status} ${res.statusText}`,
      "SERVER_ERROR",
    );
  }

  const body = await res.json();

  // FastAPI HTTPException puts the envelope inside "detail"
  if (!res.ok) {
    const envelope = body.detail ?? body;
    const error = envelope.error ?? { message: "Unknown error", code: "UNKNOWN" };
    throw new ApiError(error.message, error.code);
  }

  // Successful envelope
  const envelope = body as ApiResponse<T>;
  if (envelope.error) {
    throw new ApiError(envelope.error.message, envelope.error.code);
  }

  return envelope.data as T;
}

/** Typed API client with convenience methods. */
export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: "GET" });
  },

  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },
};
