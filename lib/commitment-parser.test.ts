import { describe, expect, it } from "vitest";
import { inferCategory, parseCommitment } from "./commitment-parser";

// Built from local parts, so the results are the same in every time zone.
const JUST_AFTER_MIDNIGHT = new Date(2026, 9, 1, 0, 30, 0, 0); // Thu 1 Oct 2026, 00:30
const MORNING = new Date(2026, 9, 1, 8, 0, 0, 0); // Thu 1 Oct 2026, 08:00
const AFTERNOON = new Date(2026, 9, 1, 15, 20, 0, 0); // Thu 1 Oct 2026, 15:20
const LATE_EVENING = new Date(2026, 9, 1, 23, 30, 0, 0); // Thu 1 Oct 2026, 23:30

describe("inferCategory", () => {
  it("recognises health, people and money, and falls back to work", () => {
    expect(inferCategory("Pick up prescription")).toBe("Health");
    expect(inferCategory("Call the doctor")).toBe("Health");
    expect(inferCategory("Call Dad about Sunday")).toBe("People");
    expect(inferCategory("Pay the electricity invoice")).toBe("Finance");
    expect(inferCategory("Send revised proposal")).toBe("Work");
  });
});

describe("parseCommitment: times", () => {
  it("reads 'tomorrow at 7 pm'", () => {
    expect(parseCommitment("Call Mum tomorrow at 7 pm", MORNING)).toMatchObject({
      title: "Call Mum",
      category: "People",
      scheduledDate: "2026-10-02",
      timeStart: "19:00",
      timeEnd: "19:30",
      riskState: "at_risk",
      priority: "medium",
      status: "active",
      recurrence: "none",
    });
  });

  it("reads minutes together with am/pm", () => {
    expect(parseCommitment("Meet at 7:30pm", MORNING)).toMatchObject({ title: "Meet", scheduledDate: "2026-10-01", timeStart: "19:30" });
  });

  it("reads 24-hour times", () => {
    expect(parseCommitment("Gym at 06:15", JUST_AFTER_MIDNIGHT)).toMatchObject({ title: "Gym", scheduledDate: "2026-10-01", timeStart: "06:15", riskState: "stable" });
    expect(parseCommitment("Pay rent at 19:45", MORNING)).toMatchObject({ title: "Pay rent", category: "Finance", timeStart: "19:45", riskState: "at_risk" });
  });

  it("treats a bare 'at 7' as 07:00", () => {
    expect(parseCommitment("Call Mum at 7", JUST_AFTER_MIDNIGHT)).toMatchObject({ title: "Call Mum", scheduledDate: "2026-10-01", timeStart: "07:00" });
  });

  it("handles 12 am and 12 pm", () => {
    expect(parseCommitment("Lunch tomorrow at 12pm", MORNING)).toMatchObject({ title: "Lunch", scheduledDate: "2026-10-02", timeStart: "12:00" });
    expect(parseCommitment("Wake up tomorrow at 12am", MORNING)).toMatchObject({ title: "Wake up", scheduledDate: "2026-10-02", timeStart: "00:00" });
  });

  it("reads 'by 5pm' as a time", () => {
    expect(parseCommitment("Send report by 5pm", MORNING)).toMatchObject({ title: "Send report", timeStart: "17:00", riskState: "stable" });
  });

  it("marks evening times as at risk", () => {
    expect(parseCommitment("Dinner at 6pm", MORNING)).toMatchObject({ timeStart: "18:00", riskState: "at_risk" });
    expect(parseCommitment("Lunch at 12pm", MORNING)).toMatchObject({ timeStart: "12:00", riskState: "stable" });
  });

  it("ends 30 minutes later and never past 23:59", () => {
    expect(parseCommitment("Late tomorrow at 11:50pm", MORNING)).toMatchObject({ title: "Late", timeStart: "23:50", timeEnd: "23:59" });
  });
});

describe("parseCommitment: titles", () => {
  it("keeps numbers in the title", () => {
    expect(parseCommitment("Buy 2 apples", AFTERNOON)).toMatchObject({ title: "Buy 2 apples" });
    expect(parseCommitment("Pay 5 invoices at 3pm", MORNING)).toMatchObject({ title: "Pay 5 invoices", category: "Finance", timeStart: "15:00" });
  });

  it("keeps the words 'at' and 'by' when they are not part of a time", () => {
    expect(parseCommitment("Look at the report tomorrow", MORNING)).toMatchObject({ title: "Look at the report", scheduledDate: "2026-10-02" });
    expect(parseCommitment("Pick up kids at school at 3pm", MORNING)).toMatchObject({ title: "Pick up kids at school", timeStart: "15:00" });
  });

  it("removes day words, stray punctuation and extra spaces", () => {
    expect(parseCommitment("  call mum   tomorrow  ", MORNING).title).toBe("Call mum");
    expect(parseCommitment("Call Mum, tomorrow at 7pm", MORNING).title).toBe("Call Mum");
    expect(parseCommitment("Call Mum today", AFTERNOON).title).toBe("Call Mum");
  });

  it("falls back to a placeholder title when only a time was typed", () => {
    expect(parseCommitment("7pm", MORNING)).toMatchObject({ title: "Untitled commitment", timeStart: "19:00" });
  });
});

describe("parseCommitment: dates", () => {
  it("with no time, picks the next whole hour so the reminder is never in the past", () => {
    expect(parseCommitment("Call Mum", AFTERNOON)).toMatchObject({ scheduledDate: "2026-10-01", timeStart: "16:00" });
    expect(parseCommitment("Call Mum today", AFTERNOON)).toMatchObject({ scheduledDate: "2026-10-01", timeStart: "16:00" });
    expect(parseCommitment("Call Mum", MORNING)).toMatchObject({ timeStart: "09:00" });
  });

  it("with 'tomorrow' and no time, uses 09:00", () => {
    expect(parseCommitment("Dentist tomorrow", MORNING)).toMatchObject({ title: "Dentist", category: "Health", scheduledDate: "2026-10-02", timeStart: "09:00" });
  });

  it("moves a time that has already passed to tomorrow, unless 'today' is said", () => {
    expect(parseCommitment("Call Dad at 8am", AFTERNOON)).toMatchObject({ title: "Call Dad", category: "People", scheduledDate: "2026-10-02", timeStart: "08:00" });
    expect(parseCommitment("Call Dad today at 8am", AFTERNOON)).toMatchObject({ title: "Call Dad", scheduledDate: "2026-10-01", timeStart: "08:00" });
  });

  it("uses the local date, not the UTC date", () => {
    expect(parseCommitment("Call Mum at 7pm", JUST_AFTER_MIDNIGHT).scheduledDate).toBe("2026-10-01");
    expect(parseCommitment("Call Mum tomorrow at 7am", LATE_EVENING).scheduledDate).toBe("2026-10-02");
    expect(parseCommitment("Call Mum at 7am", LATE_EVENING)).toMatchObject({ scheduledDate: "2026-10-02", timeStart: "07:00" });
  });
});

describe("parseCommitment: other fields", () => {
  it("detects repeats", () => {
    expect(parseCommitment("Water plants every day", MORNING)).toMatchObject({ title: "Water plants", recurrence: "daily" });
    expect(parseCommitment("Daily vitamins", MORNING)).toMatchObject({ title: "Vitamins", recurrence: "daily" });
    expect(parseCommitment("Team sync every Monday at 10am", MORNING)).toMatchObject({ title: "Team sync", recurrence: "weekly", timeStart: "10:00" });
    expect(parseCommitment("Weekly report", MORNING)).toMatchObject({ title: "Report", recurrence: "weekly" });
    expect(parseCommitment("Call Mum", MORNING).recurrence).toBe("none");
  });

  it("detects priority words", () => {
    expect(parseCommitment("Urgent: send contract", AFTERNOON)).toMatchObject({ title: "Urgent: send contract", priority: "high" });
    expect(parseCommitment("important call", AFTERNOON).priority).toBe("high");
    expect(parseCommitment("Call Mum", AFTERNOON).priority).toBe("medium");
  });

  it("gives every reminder its own id", () => {
    const first = parseCommitment("Call Mum", MORNING);
    const second = parseCommitment("Call Mum", MORNING);
    expect(first.id).toBeTruthy();
    expect(first.id).not.toBe(second.id);
  });
});