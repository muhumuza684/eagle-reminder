import { createClientId } from "@/lib/identity";
import type { Recurrence } from "@/lib/recurrence";

// Tier 1: identity is generated independently of wall-clock time.

export type ParsedCommitment = {
  id: string;
  title: string;
  category: string;
  timeStart: string;
  timeEnd: string;
  priority: "high" | "medium";
  status: "active";
  riskState: "stable" | "at_risk";
  meetingProvider?: "zoom" | "meet";
  meetingUrl?: string;
  // Tier 3 #11 â€” this was missing entirely. Without it, "Today" (index.tsx's
  // `active` list) and the 6-commitment daily cap had no date scoping at
  // all: every unresolved commitment from the account's entire history
  // counted as "today's" list, forever, since nothing ever filtered by
  // date. Defaults to the device's local today.
  scheduledDate: string;
  recurrence: Recurrence;
};

export function inferCategory(text: string) {
  const lower = text.toLowerCase();
  if (/doctor|prescription|health|gym|dentist|medicine/.test(lower)) return "Health";
  if (/call|dad|mom|family|friend|maya|partner/.test(lower)) return "People";
  if (/pay|bank|invoice|money|finance/.test(lower)) return "Finance";
  return "Work";
}

export function extractMeetingLink(text: string): { provider: "zoom" | "meet"; url: string } | null { const match = text.match(/https?:\/\/[^\s]+/i); if (!match) return null; const url = match[0].replace(/[.,!?]+$/, ""); const lower = url.toLowerCase(); if (lower.includes("zoom.us") || lower.includes("zoom.com")) return { provider: "zoom", url }; if (lower.includes("meet.google.com")) return { provider: "meet", url }; return null; }

export function normalizeMeetingUrl(value: string): string { let cleaned = value.trim().replace(/[<>]/g, "").replace(/[.,!?]+$/, ""); if (cleaned.startsWith("www.")) cleaned = `https://${cleaned}`; return cleaned; }

export function validateMeetingUrl(value: string, provider?: "zoom" | "meet"): string | null { if (!value.trim()) return null; const normalized = normalizeMeetingUrl(value); let parsed: URL; try { parsed = new URL(normalized); } catch { return "Enter a complete URL starting with https://."; } if (parsed.protocol !== "https:") return "Meeting links must use https://."; const host = parsed.hostname.toLowerCase(); const supported = provider === "zoom" ? host.endsWith("zoom.us") || host.endsWith("zoom.com") : provider === "meet" ? host === "meet.google.com" : host.endsWith("zoom.us") || host.endsWith("zoom.com") || host === "meet.google.com"; return supported ? null : "Use a supported Zoom or Google Meet link."; }

/**
 * Tier 15 update: "tomorrow" in the capture text now shifts scheduledDate
 * forward one day (previously stripped as noise but not acted on). Specific
 * weekday names ("next Tuesday") are still not parsed -- today/tomorrow
 * only for now, a further Tier 15 follow-up if needed.
 */
/** superseded-comment-marker
 * old note kept for history: this strips the words "today"/"tomorrow" from the title
 * as noise but doesn't act on them â€” "call mom tomorrow at 5pm" still
 * schedules for today. That's a separate, smaller gap (natural-language
 * date parsing) than the one this file's `scheduledDate` addition fixes,
 * and is left for a follow-up rather than expanding this fix further â€” see
 * FIXES-LOG.md.
 */
export function parseCommitment(text: string): ParsedCommitment {
  const time = text.match(/\b([01]?\d|2[0-3])(?::([0-5]\d))?\s*(am|pm)?\b/i);
  let hour = time ? Number(time[1]) : 9;
  const minute = time?.[2] ? Number(time[2]) : 0;
  const meridiem = time?.[3]?.toLowerCase();
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  const timeStart = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const timeEnd = `${String(Math.min(hour + 1, 23)).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const meeting = extractMeetingLink(text);
  const hasTomorrow = /\btomorrow\b/i.test(text);
  const scheduledDateObj = new Date();
  if (hasTomorrow) scheduledDateObj.setDate(scheduledDateObj.getDate() + 1);
  const recurrence: Recurrence = /\bevery day\b|\bdaily\b/i.test(text)
    ? "daily"
    : /\bevery week\b|\bweekly\b|\bevery (sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(text)
      ? "weekly"
      : "none";
  const cleaned = text.replace(/https?:\/\/[^\s]+/i, "").replace(/\bevery (day|week|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, "").replace(/\b(daily|weekly)\b/gi, "").replace(/\b(today|tomorrow|at|by)\b/gi, "").replace(/\b([01]?\d|2[0-3])(?::[0-5]\d)?\s*(am|pm)?\b/gi, "").replace(/\s+/g, " ").trim();
  return { id: createClientId(), title: cleaned.charAt(0).toUpperCase() + cleaned.slice(1) || "Untitled commitment", category: inferCategory(text), timeStart, timeEnd, priority: /urgent|critical|important|must/i.test(text) ? "high" : "medium", status: "active", riskState: hour >= 18 ? "at_risk" : "stable", meetingProvider: meeting?.provider, meetingUrl: meeting?.url, scheduledDate: scheduledDateObj.toISOString().slice(0, 10), recurrence };
}






