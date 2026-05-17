import { getAccessToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

/**
 * Fetch the original PDF (with the auth token) and open it in a new tab.
 * Throws with a readable message if the file is no longer on the server.
 */
export async function openOriginalPdf(documentId: string): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${BASE_URL}/api/documents/${documentId}/file`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let message = `Could not open the PDF (${res.status})`;
    try {
      const body = await res.json();
      message = body?.detail?.error?.message ?? body?.error?.message ?? message;
    } catch {
      // not JSON
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  // Give the new tab time to load before releasing the object URL.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
