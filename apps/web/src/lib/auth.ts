const ACCESS_TOKEN_KEY = "docpilot_access_token";
const REFRESH_TOKEN_KEY = "docpilot_refresh_token";
const TOKEN_COOKIE = "docpilot_has_token";

/**
 * Set a simple cookie flag so the edge middleware can detect auth state.
 * We don't put the actual JWT in the cookie — just a "1" / removal.
 */
function setCookieFlag(authenticated: boolean): void {
  if (authenticated) {
    document.cookie = `${TOKEN_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  } else {
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0`;
  }
}

/** Persist both tokens to localStorage + set the middleware cookie flag. */
export function saveTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  setCookieFlag(true);
}

/** Retrieve the current access token. */
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

/** Retrieve the current refresh token. */
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

/** Remove both tokens and clear the cookie flag (logout). */
export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  setCookieFlag(false);
}

/** Quick check whether an access token exists. */
export function isAuthenticated(): boolean {
  return getAccessToken() !== null;
}
