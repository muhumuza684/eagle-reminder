import { describe, expect, it } from "vitest";
import { inMinutes, thisEvening, tomorrowAt } from "./quick-times";

const NOON = new Date(2026, 9, 1, 12, 0, 40, 0);
const NIGHT = new Date(2026, 9, 1, 21, 30, 0, 0);

describe("quick times", () => {
  it("counts minutes from now and drops the seconds", () => {
    const d = inMinutes(10, NOON);
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([12, 10, 0]);
    expect(inMinutes(60, NOON).getHours()).toBe(13);
  });

  it("means 7 PM today while it is still ahead, otherwise tomorrow", () => {
    expect(thisEvening(NOON)).toEqual(new Date(2026, 9, 1, 19, 0, 0, 0));
    expect(thisEvening(NIGHT)).toEqual(new Date(2026, 9, 2, 19, 0, 0, 0));
  });

  it("builds tomorrow at an hour", () => {
    expect(tomorrowAt(9, NIGHT)).toEqual(new Date(2026, 9, 2, 9, 0, 0, 0));
  });
});
