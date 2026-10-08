import type { SceneKey } from "@/lib/preferences-defaults";

export const CENTER = 150;
export const LANE = 108;
export const ORBIT_SPEED = 22; // degrees per second while the bead laps the ring
export const EXPRESS_SPEED = 26;
export const BRAKE_SECONDS = 6; // the train slows to a stop over its last seconds
export const SPRING_SPAN = 120; // degrees covered by the mainspring arc
export const ARC_LENGTH = (2 * Math.PI * LANE * SPRING_SPAN) / 360;

/** Angle of a time on a 12-hour dial, in degrees clockwise from 12 o'clock. */
export const ang = (d: Date) => ((d.getHours() % 12) + d.getMinutes() / 60 + d.getSeconds() / 3600) * 30;

export function xy(angle: number, radius: number): [number, number] {
  const rad = (angle * Math.PI) / 180;
  return [CENTER + radius * Math.sin(rad), CENTER - radius * Math.cos(rad)];
}

/**
 * Where the moving part sits, `tau` seconds before the reminder is due and `goal` degrees is the
 * reminder's spot on the dial. At tau = 0 it is exactly on the goal, so it arrives on time.
 */
export function pose(scene: SceneKey, tau: number, goal: number): number {
  if (scene === "express") {
    const behind =
      tau > BRAKE_SECONDS ? EXPRESS_SPEED * (tau - BRAKE_SECONDS / 2) : (EXPRESS_SPEED * tau * tau) / (2 * BRAKE_SECONDS);
    return goal - behind;
  }
  return goal - ORBIT_SPEED * tau;
}

/** How wound the mainspring is, from 0 to 1, over the last `windowSeconds` before the time. */
export function springProgress(tau: number, windowSeconds: number): number {
  return 1 - Math.min(Math.max(tau, 0), windowSeconds) / windowSeconds;
}

export function arcPath(goal: number): string {
  const [x1, y1] = xy(goal - SPRING_SPAN, LANE);
  const [x2, y2] = xy(goal, LANE);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${LANE} ${LANE} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function trailAngles(head: number, count = 12, step = 3.4): number[] {
  return Array.from({ length: count }, (_, i) => head - i * step);
}
