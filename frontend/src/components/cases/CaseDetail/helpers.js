import { SEV_BANDS } from "./constants";

/**
 * Returns the severity band object for a given percentage (0–100).
 */
export const getBand = (pct) =>
  SEV_BANDS.find((b) => pct >= b.min && pct <= b.max) || SEV_BANDS[0];

/**
 * Decodes a base64 string (or data URI) into a Blob URL.
 * Returns { blobUrl, mime, error }.
 */
export function decodeBase64ToBlobUrl(
  base64Data,
  hintMime = "application/octet-stream"
) {
  try {
    if (!base64Data) return { blobUrl: null, mime: null, error: "No data" };

    let mime = hintMime;
    let rawBase64 = base64Data;

    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mime = match[1];
      rawBase64 = match[2];
    }

    rawBase64 = rawBase64.replace(/\s/g, "");
    const binary = atob(rawBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const resMime = (hintMime || "").toLowerCase().includes("pdf")
      ? "application/pdf"
      : mime;

    return {
      blobUrl: URL.createObjectURL(new Blob([bytes], { type: resMime })),
      mime: resMime,
      error: null,
    };
  } catch (e) {
    return { blobUrl: null, mime: null, error: e.message };
  }
}