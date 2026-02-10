/** Matches the backend TeamResponse schema. */
export interface Team {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

/** Matches the backend UserResponse schema. */
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  team: Team | null;
}

/** Matches the backend TokenResponse schema. */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/** Matches the backend AuthResponse schema (register / login). */
export interface AuthResponse {
  tokens: TokenResponse;
  user: User;
}
