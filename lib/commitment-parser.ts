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
  /** True when the text itself said when (a time, day, date or "in 2 hours"). */
  explicit: boolean;
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

// ---------- clock times ----------
// A bare number is never a time. A time is "7pm", "7:30 pm", "19:45", "at 7", or "noon";
// an optional leading "at" or "by" belongs to the time phrase.
const TIME_WITH_MERIDIEM = /\b(?:(?:at|by)\s+)?(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i;
const TIME_24H = /\b(?:(?:at|by)\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i;
const TIME_AFTER_AT = /\bat\s+([01]?\d|2[0-3])\b(?![:\d])/i;
const TIME_WORD = /\b(?:(?:at|by)\s+)?(noon|midday|midnight)\b/i;

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
  match = TIME_WORD.exec(text);
  if (match) return { hour: match[1].toLowerCase() === "midnight" ? 0 : 12, minute: 0, index: match.index, length: match[0].length };
  return null;
}

// ---------- weekdays ----------
const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tues: 2, tue: 2, wednesday: 3, wed: 3,
  thursday: 4, thurs: 4, thur: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
};
const WEEKDAY_WORDS = Object.keys(WEEKDAY_INDEX).join("|");
// "sun" is also an ordinary word ("sun cream"), so it only counts after one of the qualifiers below.
const NEEDS_QUALIFIER = new Set(["sun"]);
// A weekday after one of these words is a topic, not a date ("Call Dad about Sunday").
const NOT_A_DATE_BEFORE = new Set(["about", "for", "of", "from", "until", "till", "since", "after", "before", "with", "than", "regarding"]);
// These words in front of a weekday belong to the date phrase and are removed with it.
const DAY_QUALIFIERS = new Set(["on", "this", "next", "every", "by"]);

type DayMatch = { weekday: number; start: number; end: number; next: boolean };

function findWeekday(text: string): DayMatch | null {
  const rx = new RegExp(`\\b(${WEEKDAY_WORDS})\\b`, "gi");
  let match: RegExpExecArray | null;
  while ((match = rx.exec(text)) !== null) {
    const word = match[1].toLowerCase();
    const before = text.slice(0, match.index);
    const previous = /(\w+)\s*$/.exec(before);
    const previousWord = previous ? previous[1].toLowerCase() : "";
    if (NOT_A_DATE_BEFORE.has(previousWord)) continue;
    const qualified = previous !== null && DAY_QUALIFIERS.has(previousWord);
    if (NEEDS_QUALIFIER.has(word) && !qualified) continue;
    const weekday = WEEKDAY_INDEX[word] ?? -1;
    if (weekday < 0) continue;
    return {
      weekday,
      start: qualified && previous ? previous.index : match.index,
      end: match.index + match[0].length,
      next: previousWord === "next",
    };
  }
  return null;
}

// ---------- "in 2 hours", "in 3 days", "next week" ----------
const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};
const RELATIVE_RX = new RegExp(
  `\\bin\\s+(?:(\\d{1,3})\\s*|(${Object.keys(NUMBER_WORDS).join("|")})\\s+)(minutes?|mins?|hours?|hrs?|days?|weeks?)\\b`,
  "i",
);
const HALF_HOUR_RX = /\bin\s+half\s+an?\s+hour\b/i;
const NEXT_WEEK_RX = /\bnext\s+week\b/i;

type RelativeMatch =
  | { kind: "clock"; minutes: number; index: number; length: number }
  | { kind: "days"; days: number; index: number; length: number };

function findRelative(text: string): RelativeMatch | null {
  const half = HALF_HOUR_RX.exec(text);
  if (half) return { kind: "clock", minutes: 30, index: half.index, length: half[0].length };
  const match = RELATIVE_RX.exec(text);
  if (match) {
    const amount = match[1] ? Number(match[1]) : (NUMBER_WORDS[(match[2] ?? "").toLowerCase()] ?? 1);
    const unit = match[3].toLowerCase();
    const index = match.index;
    const length = match[0].length;
    if (unit.startsWith("min")) return { kind: "clock", minutes: amount, index, length };
    if (unit.startsWith("h")) return { kind: "clock", minutes: amount * 60, index, length };
    if (unit.startsWith("w")) return { kind: "days", days: amount * 7, index, length };
    return { kind: "days", days: amount, index, length };
  }
  const nextWeek = NEXT_WEEK_RX.exec(text);
  if (nextWeek) return { kind: "days", days: 7, index: nextWeek.index, length: nextWeek[0].length };
  return null;
}

// ---------- calendar dates: "Oct 15", "15th October", "3 Nov 2026" ----------
const MONTH_INDEX: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2, april: 3, apr: 3, may: 4, june: 5, jun: 5,
  july: 6, jul: 6, august: 7, aug: 7, september: 8, sept: 8, sep: 8, october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};
const MONTH_ALT = Object.keys(MONTH_INDEX).join("|");
const MONTH_FIRST = new RegExp(`\\b(${MONTH_ALT})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?!:)(?:,?\\s+(20\\d{2})\\b)?`, "i");
const DAY_FIRST = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${MONTH_ALT})\\b\\.?(?:,?\\s+(20\\d{2})\\b)?`, "i");

type CalendarMatch = { month: number; day: number; year: number | null; start: number; end: number };

function findCalendarDate(text: string, now: Date): CalendarMatch | null {
  for (const rx of [MONTH_FIRST, DAY_FIRST]) {
    const match = rx.exec(text);
    if (!match) continue;
    const monthWord = (rx === MONTH_FIRST ? match[1] : match[2]).toLowerCase();
    const day = Number(rx === MONTH_FIRST ? match[2] : match[1]);
    const year = match[3] ? Number(match[3]) : null;
    const month = MONTH_INDEX[monthWord] ?? -1;
    if (month < 0 || day < 1 || day > 31) continue;
    // an impossible date such as "Feb 30" rolls into the next month, so it is rejected
    const probe = new Date(year ?? now.getFullYear(), month, day);
    if (probe.getMonth() !== month) continue;
    return { month, day, year, start: match.index, end: match.index + match[0].length };
  }
  return null;
}

/**
 * Turns a sentence into a reminder. `now` can be passed in so results are repeatable.
 *
 * - "in 2 hours" / "in 30 minutes" / "in half an hour": exactly that long from now.
 * - "in 3 days" / "in 2 weeks" / "next week": that many days on, at the given time or 09:00.
 * - "tomorrow" moves the date forward one day; "today" is accepted and removed.
 * - A calendar date ("Oct 15", "15th October", "3 Nov 2026"); without a year, a date that
 *   has already passed means next year.
 * - A weekday ("Friday", "Fri", "on Friday", "this Friday", "by Friday", "every Monday")
 *   means the coming one: today if the time is still ahead, otherwise a week on.
 *   "next Friday" is the coming Friday too, except that "next <today's weekday>" always
 *   means a week on.
 * - Priority: relative > today/tomorrow > calendar date > weekday.
 * - No time at all: a day-level date means 09:00, otherwise the next whole hour, so a
 *   reminder is never created in the past.
 * - A time that has already passed today, with no day word, means tomorrow.
 */
export function parseCommitment(text: string, now: Date = new Date()): ParsedCommitment {
  const relative = findRelative(text);
  const relativeMinutes = relative && relative.kind === "clock" ? relative.minutes : null;
  const relativeDays = relative && relative.kind === "days" ? relative.days : null;
  const time = relativeMinutes !== null ? null : findTime(text);
  const hasToday = /\btoday\b/i.test(text);
  const hasTomorrow = /\btomorrow\b/i.test(text);
  const dated = relative !== null || hasToday || hasTomorrow;

  let calendar: CalendarMatch | null = dated ? null : findCalendarDate(text, now);
  if (calendar && time && time.index < calendar.end && time.index + time.length > calendar.start) calendar = null;
  const day = dated || calendar ? null : findWeekday(text);
  const ahead = day ? (day.weekday - now.getDay() + 7) % 7 : 0;

  let target = new Date(now.getTime());
  if (relativeMinutes !== null) {
    target = new Date(now.getTime() + relativeMinutes * 60_000);
    target.setSeconds(0, 0);
  } else if (calendar) {
    target = new Date(calendar.year ?? now.getFullYear(), calendar.month, calendar.day, 9, 0, 0, 0);
    if (time) target.setHours(time.hour, time.minute, 0, 0);
    if (calendar.year === null) {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const dayStart = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
      if (dayStart < todayStart) {
        target.setFullYear(target.getFullYear() + 1);
      } else if (dayStart === todayStart && !time && target.getTime() <= now.getTime()) {
        target = new Date(now.getTime());
        target.setMinutes(0, 0, 0);
        target.setHours(target.getHours() + 1);
      }
    }
  } else {
    if (relativeDays !== null) target.setDate(target.getDate() + relativeDays);
    else if (hasTomorrow) target.setDate(target.getDate() + 1);
    else if (day) target.setDate(target.getDate() + ahead);

    if (time) target.setHours(time.hour, time.minute, 0, 0);
    else if (relativeDays !== null || hasTomorrow || day) target.setHours(9, 0, 0, 0);
    else {
      target.setMinutes(0, 0, 0);
      target.setHours(target.getHours() + 1);
    }

    if (day) {
      if (day.next && ahead === 0) target.setDate(target.getDate() + 7);
      else if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 7);
    } else if (time && relativeDays === null && !hasToday && !hasTomorrow && target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
  }

  const hour = target.getHours();
  const minute = target.getMinutes();
  const endMinutes = Math.min(hour * 60 + minute + 30, 23 * 60 + 59);
  const timeStart = `${pad(hour)}:${pad(minute)}`;
  const timeEnd = `${pad(Math.floor(endMinutes / 60))}:${pad(endMinutes % 60)}`;

  const weeklyRx = new RegExp(`\\bevery week\\b|\\bweekly\\b|\\bevery (${WEEKDAY_WORDS})\\b`, "i");
  const recurrence: Recurrence = /\bevery day\b|\bdaily\b/i.test(text) ? "daily" : weeklyRx.test(text) ? "weekly" : "none";

  // Only the words that carried the date, time and repeat are removed from the title.
  const spans: { start: number; end: number }[] = [];
  if (relative) spans.push({ start: relative.index, end: relative.index + relative.length });
  if (time) spans.push({ start: time.index, end: time.index + time.length });
  if (calendar) spans.push({ start: calendar.start, end: calendar.end });
  if (day) spans.push({ start: day.start, end: day.end });
  spans.sort((a, b) => b.start - a.start);
  let withoutSpans = text;
  for (const span of spans) withoutSpans = withoutSpans.slice(0, span.start) + " " + withoutSpans.slice(span.end);

  const cleaned = withoutSpans
    .replace(new RegExp(`\\bevery (day|week|${WEEKDAY_WORDS})\\b`, "gi"), " ")
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
    explicit: relative !== null || time !== null || hasToday || hasTomorrow || calendar !== null || day !== null,
  };
}