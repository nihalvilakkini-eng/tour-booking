"use client";

export interface ApiResponseResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
}

/**
 * Safely parses fetch responses regardless of content type (JSON, plain text, or HTML).
 * Prevents "Unexpected token 'R', 'Request En'... is not valid JSON" errors
 * and extracts human-readable error messages.
 */
export async function parseApiResponse<T = Record<string, unknown>>(
  response: Response,
  fallbackMessage = "Request failed"
): Promise<ApiResponseResult<T>> {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const status = response.status;

  let rawText = "";
  try {
    rawText = await response.text();
  } catch {
    rawText = "";
  }

  let jsonData: T | null = null;
  const isJsonHeader =
    contentType.includes("application/json") || contentType.includes("+json");
  const looksLikeJson =
    rawText.trim().startsWith("{") || rawText.trim().startsWith("[");

  if (isJsonHeader || looksLikeJson) {
    try {
      jsonData = JSON.parse(rawText) as T;
    } catch {
      jsonData = null;
    }
  }

  // Extract message from JSON payload if present
  let extractedMessage = "";
  if (jsonData && typeof jsonData === "object") {
    const record = jsonData as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) {
      extractedMessage = record.message.trim();
    } else if (typeof record.error === "string" && record.error.trim()) {
      extractedMessage = record.error.trim();
    }
  }

  // Derive meaningful error message for non-JSON or missing message
  if (!extractedMessage) {
    const lowerText = rawText.toLowerCase();

    if (
      status === 413 ||
      lowerText.includes("request entity too large") ||
      lowerText.includes("payload too large")
    ) {
      extractedMessage =
        "The uploaded images or tour payload are too large for the server (HTTP 413). Please upload compressed images directly to Cloudinary.";
    } else if (status === 401) {
      extractedMessage = "Your session has expired. Please log in again.";
    } else if (status === 403) {
      extractedMessage = "You do not have permission to perform this action.";
    } else if (status === 404) {
      extractedMessage = "The requested tour resource was not found (HTTP 404).";
    } else if (status === 415) {
      extractedMessage = "Unsupported payload format (HTTP 415). Please submit valid JSON.";
    } else if (status >= 500 && status < 600) {
      extractedMessage =
        "The tour service is temporarily unavailable (HTTP " +
        status +
        "). Please try again in a few moments.";
    } else if (
      rawText &&
      rawText.length < 300 &&
      !rawText.includes("<html") &&
      !rawText.includes("<!DOCTYPE")
    ) {
      extractedMessage = rawText.trim();
    } else {
      extractedMessage = `${fallbackMessage} (HTTP ${status})`;
    }
  }

  const ok =
    response.ok &&
    (jsonData ? (jsonData as Record<string, unknown>).success !== false : true);

  return {
    ok,
    status,
    data: jsonData,
    message: extractedMessage,
  };
}
