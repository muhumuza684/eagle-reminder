/** The one-tap choices under "When?". Each returns the moment it means, from `now`. */
export function inMinutes(minutes: number, now: Date = new Date()): Date {
  const d = new Date(now.getTime() + minutes * 60000);
  d.setSeconds(0, 0);
  return d;
}

/** 7 PM today, or 7 PM tomorrow once today's 7 PM has gone. */
export function thisEvening(now: Date = new Date()): Date {
  const d = new Date(now);
  d.setHours(19, 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d;
}

export function tomorrowAt(hour: number, now: Date = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}
