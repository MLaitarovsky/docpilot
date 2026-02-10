/** Standard API response envelope from the backend. */
export interface ApiResponse<T> {
  data: T | null;
  error: {
    message: string;
    code: string;
  } | null;
}
