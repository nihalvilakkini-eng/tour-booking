export function isBookingCompleted(status: unknown): boolean {
  return typeof status === "string" && status.trim().toLowerCase() === "completed";
}
