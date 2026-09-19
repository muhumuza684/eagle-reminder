/** Circular mean + concentration for clock-time data. Plain averaging of
 * 23:00 and 01:00 gives noon (wrong); circular mean gives midnight (right). */
export type CircularResult = { meanMinutes: number; kappa: number };

export function circularTimeStats(minutesOfDay: number[]): CircularResult | null {
  if (minutesOfDay.length === 0) return null;
  const toRad = (m: number) => (m / 1440) * 2 * Math.PI;
  let sumSin = 0;
  let sumCos = 0;
  for (const m of minutesOfDay) {
    sumSin += Math.sin(toRad(m));
    sumCos += Math.cos(toRad(m));
  }
  const n = minutesOfDay.length;
  const meanSin = sumSin / n;
  const meanCos = sumCos / n;
  const r = Math.sqrt(meanSin * meanSin + meanCos * meanCos);
  let meanAngle = Math.atan2(meanSin, meanCos);
  if (meanAngle < 0) meanAngle += 2 * Math.PI;
  const meanMinutes = Math.round((meanAngle / (2 * Math.PI)) * 1440);
  const kappa =
    r < 0.53
      ? 2 * r + r ** 3 + (5 * r ** 5) / 6
      : r >= 0.85
        ? 1 / (r ** 3 - 4 * r ** 2 + 3 * r)
        : -0.4 + 1.39 * r + 0.43 / (1 - r);
  return { meanMinutes, kappa };
}

/** kappa above this = confident enough to state a time-of-day claim. */
export const KAPPA_CONFIDENCE_THRESHOLD = 1.0;

export function formatMinutesAsClock(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m).padStart(2, "0")} ${period}`;
}
