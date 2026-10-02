import { describe, expect, it } from "vitest";
import { parseCommitment } from "./commitment-parser";

// Built from local parts, so the results are the same in every time zone.
const THURSDAY_MORNING = new Date(2026, 9, 1, 8, 0, 0, 0); // Thu 1 Oct 2026, 08:00
const THURSDAY_AFTERNOON = new Date(2026, 9, 1, 15, 20, 0, 0); // Thu 1 Oct 2026, 15:20

describe("parseCommitment: noon and midnight", () => {
  it("reads noon and midday", () => {
    expect(parseCommitment("Lunch at noon", THURSDAY_MORNING)).toMatchObject({ title: "Lunch", scheduledDate: "2026-10-01", timeStart: "12:00" });
    expect(parseCommitment("Meet at midday", THURSDAY_MORNING)).toMatchObject({ title: "Meet", timeStart: "12:00" });
    expect(parseCommitment("Lunch noon tomorrow", THURSDAY_MORNING)).toMatchObject({ title: "Lunch", scheduledDate: "2026-10-02", timeStart: "12:00" });
  });

  it("moves a noon that has already passed to tomorrow", () => {
    expect(parseCommitment("Lunch at noon", THURSDAY_AFTERNOON)).toMatchObject({ scheduledDate: "2026-10-02", timeStart: "12:00" });
  });

  it("reads midnight as the coming 00:00", () => {
    expect(parseCommitment("Call Mum at midnight", THURSDAY_MORNING)).toMatchObject({
      title: "Call Mum",
      scheduledDate: "2026-10-02",
      timeStart: "00:00",
      timeEnd: "00:30",
      riskState: "stable",
    });
  });
});

describe("parseCommitment: next week", () => {
  it("moves 'next week' forward seven days, at 09:00 or the given time", () => {
    expect(parseCommitment("Review budget next week", THURSDAY_MORNING)).toMatchObject({ title: "Review budget", scheduledDate: "2026-10-08", timeStart: "09:00" });
    expect(parseCommitment("Call Dad next week at 5pm", THURSDAY_MORNING)).toMatchObject({ title: "Call Dad", scheduledDate: "2026-10-08", timeStart: "17:00" });
  });

  it("does not read 'next weekend' as 'next week'", () => {
    expect(parseCommitment("Plan next weekend", THURSDAY_MORNING)).toMatchObject({ title: "Plan next weekend", scheduledDate: "2026-10-01" });
  });
});

describe("parseCommitment: calendar dates", () => {
  it("reads month then day", () => {
    expect(parseCommitment("Pay rent Oct 15", THURSDAY_MORNING)).toMatchObject({ title: "Pay rent", category: "Finance", scheduledDate: "2026-10-15", timeStart: "09:00" });
    expect(parseCommitment("October 15th submit form", THURSDAY_MORNING)).toMatchObject({ title: "Submit form", scheduledDate: "2026-10-15" });
  });

  it("reads day then month", () => {
    expect(parseCommitment("Birthday party 15th October", THURSDAY_MORNING)).toMatchObject({ title: "Birthday party", scheduledDate: "2026-10-15" });
    expect(parseCommitment("Gift 25 Dec", THURSDAY_MORNING)).toMatchObject({ title: "Gift", scheduledDate: "2026-12-25", timeStart: "09:00" });
    expect(parseCommitment("Pay deposit 3rd of November", THURSDAY_MORNING)).toMatchObject({ title: "Pay deposit", scheduledDate: "2026-11-03" });
  });

  it("reads a time next to the date, and an explicit year", () => {
    expect(parseCommitment("Oct 15 at 3pm submit form", THURSDAY_MORNING)).toMatchObject({ title: "Submit form", scheduledDate: "2026-10-15", timeStart: "15:00" });
    expect(parseCommitment("Flight 3 Nov 2026 at 6am", THURSDAY_MORNING)).toMatchObject({ title: "Flight", scheduledDate: "2026-11-03", timeStart: "06:00" });
  });

  it("moves a date that has already passed to next year", () => {
    expect(parseCommitment("Renew pass Mar 3", THURSDAY_MORNING)).toMatchObject({ title: "Renew pass", scheduledDate: "2027-03-03", timeStart: "09:00" });
  });

  it("keeps today's date, using the next hour once 09:00 has gone", () => {
    expect(parseCommitment("Call Mum Oct 1", THURSDAY_MORNING)).toMatchObject({ scheduledDate: "2026-10-01", timeStart: "09:00" });
    expect(parseCommitment("Call Mum Oct 1", THURSDAY_AFTERNOON)).toMatchObject({ scheduledDate: "2026-10-01", timeStart: "16:00" });
  });

  it("ignores impossible dates and the ordinary word 'may'", () => {
    expect(parseCommitment("Feb 30 party", THURSDAY_MORNING)).toMatchObject({ title: "Feb 30 party", scheduledDate: "2026-10-01", timeStart: "09:00" });
    expect(parseCommitment("May I borrow a pen", THURSDAY_MORNING)).toMatchObject({ title: "May I borrow a pen", timeStart: "09:00" });
  });
});

describe("parseCommitment: weekday abbreviations", () => {
  it("reads common abbreviations", () => {
    expect(parseCommitment("Gym Fri at 6pm", THURSDAY_MORNING)).toMatchObject({ title: "Gym", category: "Health", scheduledDate: "2026-10-02", timeStart: "18:00" });
    expect(parseCommitment("Team sync Mon at 10am", THURSDAY_MORNING)).toMatchObject({ title: "Team sync", scheduledDate: "2026-10-05", timeStart: "10:00" });
    expect(parseCommitment("Call Dad Tues", THURSDAY_MORNING)).toMatchObject({ title: "Call Dad", scheduledDate: "2026-10-06" });
    expect(parseCommitment("Dinner on Sat", THURSDAY_MORNING)).toMatchObject({ title: "Dinner", scheduledDate: "2026-10-03", timeStart: "09:00" });
    expect(parseCommitment("Standup Thurs", THURSDAY_MORNING)).toMatchObject({ title: "Standup", scheduledDate: "2026-10-01", timeStart: "09:00" });
  });

  it("reads 'sun' only after on / this / next / every / by", () => {
    expect(parseCommitment("Buy sun cream", THURSDAY_MORNING)).toMatchObject({ title: "Buy sun cream", scheduledDate: "2026-10-01", timeStart: "09:00" });
    expect(parseCommitment("Brunch on Sun", THURSDAY_MORNING)).toMatchObject({ title: "Brunch", scheduledDate: "2026-10-04" });
  });

  it("starts a weekly repeat on an abbreviated weekday", () => {
    expect(parseCommitment("Yoga every Wed", THURSDAY_MORNING)).toMatchObject({ title: "Yoga", recurrence: "weekly", scheduledDate: "2026-10-07", timeStart: "09:00" });
    expect(parseCommitment("Standup every tue at 9am", THURSDAY_MORNING)).toMatchObject({ title: "Standup", recurrence: "weekly", scheduledDate: "2026-10-06", timeStart: "09:00" });
  });

  it("treats 'next Mon' as the coming Monday", () => {
    expect(parseCommitment("Call next Mon", THURSDAY_MORNING)).toMatchObject({ title: "Call", scheduledDate: "2026-10-05" });
  });
});