import { describe, expect, it } from "vitest";
import { parseCommitment } from "./commitment-parser";

// Built from local parts, so the results are the same in every time zone.
const THURSDAY_MORNING = new Date(2026, 9, 1, 8, 0, 0, 0); // Thu 1 Oct 2026, 08:00
const THURSDAY_AFTERNOON = new Date(2026, 9, 1, 15, 20, 0, 0); // Thu 1 Oct 2026, 15:20
const THURSDAY_LATE = new Date(2026, 9, 1, 23, 30, 0, 0); // Thu 1 Oct 2026, 23:30
const WEDNESDAY_MORNING = new Date(2026, 9, 28, 8, 0, 0, 0); // Wed 28 Oct 2026, 08:00

describe("parseCommitment: weekdays", () => {
  it("reads a plain weekday and defaults to 09:00", () => {
    expect(parseCommitment("Team lunch Friday", THURSDAY_MORNING)).toMatchObject({ title: "Team lunch", scheduledDate: "2026-10-02", timeStart: "09:00" });
    expect(parseCommitment("Gym on Monday", THURSDAY_MORNING)).toMatchObject({ title: "Gym", scheduledDate: "2026-10-05", timeStart: "09:00" });
  });

  it("reads on / this / by in front of a weekday", () => {
    expect(parseCommitment("Dentist on Friday at 3pm", THURSDAY_MORNING)).toMatchObject({ title: "Dentist", category: "Health", scheduledDate: "2026-10-02", timeStart: "15:00" });
    expect(parseCommitment("Call Mum this Saturday", THURSDAY_MORNING)).toMatchObject({ title: "Call Mum", scheduledDate: "2026-10-03", timeStart: "09:00" });
    expect(parseCommitment("Send invoice by Friday", THURSDAY_MORNING)).toMatchObject({ title: "Send invoice", category: "Finance", scheduledDate: "2026-10-02" });
  });

  it("keeps today when the time is still ahead, otherwise goes a week on", () => {
    expect(parseCommitment("Standup Thursday at 5pm", THURSDAY_MORNING)).toMatchObject({ title: "Standup", scheduledDate: "2026-10-01", timeStart: "17:00" });
    expect(parseCommitment("Standup Thursday at 7am", THURSDAY_MORNING)).toMatchObject({ scheduledDate: "2026-10-08", timeStart: "07:00" });
    expect(parseCommitment("Report Thursday", THURSDAY_MORNING)).toMatchObject({ scheduledDate: "2026-10-01", timeStart: "09:00" });
    expect(parseCommitment("Report Thursday", THURSDAY_AFTERNOON)).toMatchObject({ scheduledDate: "2026-10-08", timeStart: "09:00" });
  });

  it("treats 'next' as the coming one, but never today", () => {
    expect(parseCommitment("Call Dad next Friday", THURSDAY_MORNING)).toMatchObject({ title: "Call Dad", scheduledDate: "2026-10-02" });
    expect(parseCommitment("Call Dad next Thursday", THURSDAY_MORNING)).toMatchObject({ title: "Call Dad", scheduledDate: "2026-10-08", timeStart: "09:00" });
  });

  it("starts a weekly repeat on that weekday", () => {
    expect(parseCommitment("Team sync every Monday at 10am", THURSDAY_MORNING)).toMatchObject({ title: "Team sync", recurrence: "weekly", scheduledDate: "2026-10-05", timeStart: "10:00" });
    expect(parseCommitment("Yoga every Sunday", THURSDAY_MORNING)).toMatchObject({ title: "Yoga", recurrence: "weekly", scheduledDate: "2026-10-04", timeStart: "09:00" });
  });

  it("does not read a weekday as a date after about / for / of / from", () => {
    expect(parseCommitment("Call Dad about Sunday", THURSDAY_MORNING)).toMatchObject({ title: "Call Dad about Sunday", scheduledDate: "2026-10-01", timeStart: "09:00", recurrence: "none" });
    expect(parseCommitment("Buy a card for Friday", THURSDAY_MORNING)).toMatchObject({ title: "Buy a card for Friday", scheduledDate: "2026-10-01" });
  });

  it("ignores letter case", () => {
    expect(parseCommitment("gym on FRIDAY", THURSDAY_MORNING)).toMatchObject({ title: "Gym", scheduledDate: "2026-10-02" });
  });

  it("crosses month boundaries", () => {
    expect(parseCommitment("Pay rent Monday", WEDNESDAY_MORNING)).toMatchObject({ title: "Pay rent", scheduledDate: "2026-11-02" });
    expect(parseCommitment("Pay rent Friday", WEDNESDAY_MORNING)).toMatchObject({ scheduledDate: "2026-10-30" });
  });
});

describe("parseCommitment: relative times", () => {
  it("adds minutes and hours to now", () => {
    expect(parseCommitment("Call Mum in 2 hours", THURSDAY_AFTERNOON)).toMatchObject({ title: "Call Mum", scheduledDate: "2026-10-01", timeStart: "17:20", timeEnd: "17:50" });
    expect(parseCommitment("Take pills in 30 minutes", THURSDAY_MORNING)).toMatchObject({ title: "Take pills", timeStart: "08:30" });
    expect(parseCommitment("Stretch in 45 mins", THURSDAY_MORNING)).toMatchObject({ title: "Stretch", timeStart: "08:45" });
  });

  it("understands number words, 'an hour' and 'half an hour'", () => {
    expect(parseCommitment("Check email in two hours", THURSDAY_MORNING)).toMatchObject({ title: "Check email", timeStart: "10:00" });
    expect(parseCommitment("Check oven in an hour", THURSDAY_MORNING)).toMatchObject({ title: "Check oven", timeStart: "09:00" });
    expect(parseCommitment("Check oven in half an hour", THURSDAY_MORNING)).toMatchObject({ title: "Check oven", timeStart: "08:30" });
  });

  it("carries over midnight", () => {
    expect(parseCommitment("Call Mum in 1 hour", THURSDAY_LATE)).toMatchObject({ scheduledDate: "2026-10-02", timeStart: "00:30", timeEnd: "01:00" });
  });

  it("moves days and weeks, at 09:00 or the given time", () => {
    expect(parseCommitment("Renew passport in 3 days", THURSDAY_MORNING)).toMatchObject({ title: "Renew passport", scheduledDate: "2026-10-04", timeStart: "09:00" });
    expect(parseCommitment("Review budget in 2 weeks", THURSDAY_MORNING)).toMatchObject({ title: "Review budget", scheduledDate: "2026-10-15", timeStart: "09:00" });
    expect(parseCommitment("Call back in 2 days at 5pm", THURSDAY_MORNING)).toMatchObject({ title: "Call back", scheduledDate: "2026-10-03", timeStart: "17:00" });
  });

  it("ignores 'in' when no amount and unit follow", () => {
    expect(parseCommitment("Check in on Mum", THURSDAY_MORNING)).toMatchObject({ title: "Check in on Mum", scheduledDate: "2026-10-01", timeStart: "09:00" });
    expect(parseCommitment("Stay in 2 rooms", THURSDAY_MORNING)).toMatchObject({ title: "Stay in 2 rooms", scheduledDate: "2026-10-01", timeStart: "09:00" });
  });

  it("marks late results as at risk", () => {
    expect(parseCommitment("Call Mum in 4 hours", THURSDAY_AFTERNOON)).toMatchObject({ timeStart: "19:20", riskState: "at_risk" });
  });
});