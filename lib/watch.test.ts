import { describe, expect, it } from "vitest";
import { ang, arcPath, pose, springProgress, trailAngles, xy } from "./watch";

describe("watch geometry", () => {
  it("places times on a 12-hour dial", () => {
    expect(ang(new Date(2026, 9, 1, 12, 30))).toBeCloseTo(15);
    expect(ang(new Date(2026, 9, 1, 3, 0))).toBeCloseTo(90);
    expect(ang(new Date(2026, 9, 1, 19, 0))).toBeCloseTo(210);
  });

  it("converts angles to dial points", () => {
    const [x, y] = xy(0, 100);
    expect(x).toBeCloseTo(150);
    expect(y).toBeCloseTo(50);
    const [rx, ry] = xy(90, 100);
    expect(rx).toBeCloseTo(250);
    expect(ry).toBeCloseTo(150);
  });
});

describe("pose: the moving part arrives exactly on time", () => {
  it("lands on the goal at tau = 0 for every motion", () => {
    expect(pose("orbit", 0, 15)).toBe(15);
    expect(pose("spring", 0, 15)).toBe(15);
    expect(pose("express", 0, 15)).toBe(15);
  });

  it("keeps lapping while time remains", () => {
    expect(pose("orbit", 10, 90)).toBeCloseTo(90 - 220);
    expect(pose("orbit", 11, 90)).toBeLessThan(pose("orbit", 10, 90));
  });

  it("slows the train smoothly into the station", () => {
    expect(pose("express", 6, 0)).toBeCloseTo(-78); // 26 deg/s * (6 - 3)
    expect(pose("express", 3, 0)).toBeGreaterThan(pose("express", 6, 0));
    expect(pose("express", 1, 0)).toBeCloseTo(-26 / 12);
    expect(pose("express", 0.5, 0)).toBeGreaterThan(pose("express", 1, 0));
  });
});

describe("mainspring", () => {
  it("winds from 0 to 1 over the window", () => {
    expect(springProgress(120, 60)).toBe(0);
    expect(springProgress(60, 60)).toBe(0);
    expect(springProgress(30, 60)).toBeCloseTo(0.5);
    expect(springProgress(0, 60)).toBe(1);
  });

  it("draws a clockwise arc that ends on the goal", () => {
    const [x, y] = xy(15, 108);
    expect(arcPath(15).endsWith(`${x.toFixed(2)} ${y.toFixed(2)}`)).toBe(true);
  });
});

describe("orbit trail", () => {
  it("trails behind the head", () => {
    expect(trailAngles(100, 3, 4)).toEqual([100, 96, 92]);
  });
});
