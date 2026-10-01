import { createClientId } from "@/lib/identity";
import type { Recurrence } from "@/lib/recurrence";

export type ParsedCommitment = {
  id: string;
  title: string;
  category: string;
  scheduledDate: string;
  timeStart: string;
  timeEnd: string;
  priority: "high" | "medium";
  status: "active";
  riskState: "stable" | "at_risk";
  recurrence: Recurrence;
};

const pad = (value: number) => String(value).padStart(2, "0");

// The device's local date, never the UTC date (they differ for hours every day).
function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function inferCategory(text: string) {
  const lower = text.toLowerCase();
  if (/doctor|prescription|health|gym|dentist|medicine/.test(lower)) return "Health";
  if (/call|dad|mom|family|friend|maya|partner/.test(lower)) return "People";
  if (/pay|bank|invoice|money|finance/.test(lower)) return "Finance";
  return "Work";
}

// A bare number is never a time. A time is "7pm", "7:30 pm", "19:45", or "at 7";
// an optional leading "at" or "by" belongs to the time phrase.
const TIME_WITH_MERIDIEM = /\b(?:(?:at|by)\s+)?(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i;
const TIME_24H = /\b(?:(?:at|by)\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i;
const TIME_AFTER_AT = /\bat\s+([01]?\d|2[0-3])\b(?![:\d])/i;

type TimeMatch = { hour: number; minute: number; index: number; length: number };

function findTime(text: string): TimeMatch | null {
  let match = TIME_WITH_MERIDIEM.exec(text);
  if (match) {
    const meridiem = (match[3] ?? "").toLowerCase();
    let hour = Number(match[1]);
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;
    return { hour, minute: match[2] ? Number(match[2]) : 0, index: match.index, length: match[0].length };
  }
  match = TIME_24H.exec(text);
  if (match) return { hour: Number(match[1]), minute: Number(match[2]), index: match.index, length: match[0].length };
  match = TIME_AFTER_AT.exec(text);
  if (match) return { hour: Number(match[1]), minute: 0, index: match.index, length: match[0].length };
  return null;
}

/**
 * Turns a sentence into a reminder. `now` can be passed in so results are repeatable.
 *
 * - "tomorrow" moves the date forward one day; "today" is accepted and removed.
 * - No time at all: tomorrow means 09:00, otherwise the next whole hour, so a
 *   reminder is never created in the past.
 * - A time that has already passed today, with no "today"/"tomorrow", means tomorrow.
 * - Weekday names ("Friday", "every Monday") do not move the date yet.
 */
export function parseCommitment(text: string, now: Date = new Date()): ParsedCommitment {
  const time = findTime(text);
  const hasToday = /\btoday\b/i.test(text);
  const hasTomorrow = /\btomorrow\b/i.test(text);

  const target = new Date(now.getTime());
  if (hasTomorrow) target.setDate(target.getDate() + 1);

  if (time) {
    target.setHours(time.hour, time.minute, 0, 0);
    if (!hasToday && !hasTomorrow && target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  } else if (hasTomorrow) {
    target.setHours(9, 0, 0, 0);
  } else {
    target.setMinutes(0, 0, 0);
    target.setHours(target.getHours() + 1);
  }

  const hour = target.getHours();
  const minute = target.getMinutes();
  const endMinutes = Math.min(hour * 60 + minute + 30, 23 * 60 + 59);
  const timeStart = `${pad(hour)}:${pad(minute)}`;
  const timeEnd = `${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}`;

  const recurrence: Recurrence = /\bevery day\b|\bdaily\b/i.test(text)
    ? "daily"
    : /\bevery week\b|\bweekly\b|\bevery (sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(text)
      ? "weekly"
      : "none";

  // Only the words that carried the date, time and repeat are removed from the title.
  const withoutTime = time ? text.slice(0, time.index) + " " + text.slice(time.index + time.length) : text;
  const cleaned = withoutTime
    .replace(/\bevery (day|week|sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, " ")
    .replace(/\b(daily|weekly)\b/gi, " ")
    .replace(/\b(?:by\s+)?(?:today|tomorrow)\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, "");
  const title = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  return {
    id: createClientId(),
    title: title || "Untitled commitment",
    category: inferCategory(text),
    scheduledDate: localDateKey(target),
    timeStart,
    timeEnd,
    priority: /urgent|critical|important|must/i.test(text) ? "high" : "medium",
    status: "active",
    riskState: hour >= 18 ? "at_risk" : "stable",
    recurrence,
  };
}