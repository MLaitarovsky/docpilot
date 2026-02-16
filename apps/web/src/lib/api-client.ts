import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from "@/lib/auth";
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

/** Try to refresh the access token using the stored refresh token. */
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) return null;

    const body = await res.json();
    const tokens = body.data?.tokens ?? body.data;
    if (tokens?.access_token && tokens?.refresh_token) {
      saveTokens(tokens.access_token, tokens.refresh_token);
      return tokens.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Core fetch wrapper.
 * - Prepends the API base URL
 * - Attaches the Bearer token (if present)
 * - Unwraps the { data, error } envelope
 * - Auto-refreshes the token on 401 and retries once
 * - Throws ApiError on error responses
 */
async function request<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Only set Content-Type for non-FormData bodies
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Auto-refresh on 401 (once)
  if (res.status === 401 && !_isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, true);
    }
    // Refresh failed — clear tokens so the middleware redirects to login
    clearTokens();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Session expired", "AUTH_EXPIRED");
  }

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

  /** Upload a file using multipart/form-data. */
  upload<T>(path: string, formData: FormData): Promise<T> {
    return request<T>(path, {
      method: "POST",
      body: formData,
      // Don't set Content-Type — browser sets it with boundary automatically
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
