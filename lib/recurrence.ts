export type Recurrence = "none" | "daily" | "weekly";

/** Next scheduledDate (YYYY-MM-DD) after fromDateKey for the given recurrence. */
export function nextScheduledDate(fromDateKey: string, recurrence: Recurrence): string {
  const [year, month, day] = fromDateKey.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + (recurrence === "weekly" ? 7 : 1));
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True when a closed-out recurring commitment needs its next instance created. */
export function needsRegeneration(
  commitment: { recurrence?: Recurrence; scheduledDate: string; status: string; deletedAt?: string },
  todayKey: string
): boolean {
  if (!commitment.recurrence || commitment.recurrence === "none") return false;
  if (commitment.deletedAt) return false;
  if (commitment.status !== "completed" && commitment.status !== "missed") return false;
  return commitment.scheduledDate < todayKey;
}

