import { getAccessToken } from "@/lib/auth";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

/**
 * Download an export of a document. Issues a fetch with the auth token,
 * extracts the file from the response, and triggers a browser download.
 */
export async function downloadExport(
  documentId: string,
  format: "csv" | "docx",
  filenameStem: string,
): Promise<void> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(
    `${BASE_URL}/api/documents/${documentId}/export?format=${format}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!res.ok) {
    let message = `Export failed (${res.status})`;
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
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filenameStem}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
