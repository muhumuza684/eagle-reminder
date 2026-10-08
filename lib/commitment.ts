import type { Recurrence } from "@/lib/recurrence";

export type Commitment = {
  id: string;
  title: string;
  category: string;
  scheduledDate: string;
  timeStart: string;
  timeEnd: string;
  priority: "high" | "medium" | "low";
  status: "active" | "completed" | "rescheduled" | "missed";
  riskState: "stable" | "at_risk" | "rescued" | "missed";
  deletedAt?: string;
  recurrence?: Recurrence;
};

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isOpen(item: Commitment): boolean {
  return !item.deletedAt && (item.status === "active" || item.status === "rescheduled");
}

/** The moment a commitment is due, or null when its stored date or time is unreadable. */
export function whenOf(item: Commitment): Date | null {
  const [y, m, d] = item.scheduledDate.split("-").map(Number);
  const [h, mi] = item.timeStart.split(":").map(Number);
  if ([y, m, d, h, mi].some((part) => Number.isNaN(part))) return null;
  return new Date(y, m - 1, d, h, mi, 0, 0);
}
