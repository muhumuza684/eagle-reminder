const pad = (value: number) => String(value).padStart(2, "0");

export const formatHHMM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const clock12 = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

export const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

/** "in 25 min", "in 2 h 15 min", "in 3 d" or "right now". */
export function relativeTime(target: Date, now: Date = new Date()): string {
  const minutes = Math.round((target.getTime() - now.getTime()) / 60000);
  if (minutes < 1) return "right now";
  if (minutes < 60) return `in ${minutes} min`;
  if (minutes < 1440) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `in ${h} h${m ? ` ${m} min` : ""}`;
  }
  return `in ${Math.floor(minutes / 1440)} d`;
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"] as const;
