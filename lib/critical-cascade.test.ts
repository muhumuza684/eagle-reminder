import { describe, expect, it } from "vitest";
import {
  acknowledgeCheckpoint,
  buildCriticalCheckpoints,
  cascadeStatus,
  commitmentDeadlineIso,
  escalateCheckpoint,
  expireUnacknowledged,
  parseCriticalCommitment,
  parseDeadlinePhrase,
  shouldEscalate,
} from "./critical-cascade";

describe("exactly two checkpoints (FR-G2)", () => {
  it("always produces exactly a day-before and a three-hours-before checkpoint, in that order", () => {
    const deadline = new Date("2026-09-20T18:30:00");
    const checkpoints = buildCriticalCheckpoints(deadline);
    expect(checkpoints).toHaveLength(2);
    expect(checkpoints.map((c) => c.stage)).toEqual(["day_before", "three_hours"]);
    expect(checkpoints.every((c) => c.status === "pending")).toBe(true);
  });

  it("schedules the day-before checkpoint 24 hours ahead of the three-hours checkpoint", () => {
    const deadline = new Date("2026-09-20T18:30:00");
    const [dayBefore, threeHours] = buildCriticalCheckpoints(deadline);
    const gapMs = new Date(threeHours.dueAt).getTime() - new Date(dayBefore.dueAt).getTime();
    expect(gapMs).toBe(21 * 60 * 60 * 1000); // 24h gap minus the 3h offset baked into threeHours
  });

  it("schedules the three-hours checkpoint exactly 3 hours ahead of the deadline", () => {
    const deadline = new Date("2026-09-20T18:30:00");
    const [, threeHours] = buildCriticalCheckpoints(deadline);
    const gapMs = deadline.getTime() - new Date(threeHours.dueAt).getTime();
    expect(gapMs).toBe(3 * 60 * 60 * 1000);
  });

  it("accepts an ISO string deadline as well as a Date", () => {
    const iso = commitmentDeadlineIso("2026-09-20", "18:30");
    expect(buildCriticalCheckpoints(iso)).toHaveLength(2);
  });
});

describe("natural-language deadline parsing (FR-G1, FR-G4)", () => {
  it("parses an explicit time into a same-day deadline when it is still ahead", () => {
    const now = new Date("2026-09-20T09:00:00");
    const { deadline, ambiguous } = parseDeadlinePhrase("before 5pm", now);
    expect(ambiguous).toBe(false);
    expect(deadline?.toISOString()).toBe(new Date("2026-09-20T17:00:00").toISOString());
  });

  it("rolls an already-passed same-day time to the next day", () => {
    const now = new Date("2026-09-20T20:00:00");
    const { deadline, ambiguous } = parseDeadlinePhrase("before 5pm", now);
    expect(ambiguous).toBe(false);
    expect(deadline?.toISOString()).toBe(new Date("2026-09-21T17:00:00").toISOString());
  });

  it("respects an explicit tomorrow", () => {
    const now = new Date("2026-09-20T09:00:00");
    const { deadline } = parseDeadlinePhrase("before 9am tomorrow", now);
    expect(deadline?.toISOString()).toBe(new Date("2026-09-21T09:00:00").toISOString());
  });

  it("flags a deadline as ambiguous when no explicit time is given", () => {
    expect(parseDeadlinePhrase("before Friday").ambiguous).toBe(true);
    expect(parseDeadlinePhrase("before the meeting").ambiguous).toBe(true);
    expect(parseDeadlinePhrase("").ambiguous).toBe(true);
  });

  it("extracts the title separately from the deadline clause", () => {
    const now = new Date("2026-09-20T09:00:00");
    const result = parseCriticalCommitment("Eagle, don't let me forget the passport renewal before 5pm tomorrow", now);
    expect(result.title.toLowerCase()).toBe("the passport renewal");
    expect(result.ambiguous).toBe(false);
    expect(result.deadline?.toISOString()).toBe(new Date("2026-09-21T17:00:00").toISOString());
  });

  it("asks for clarification instead of guessing when the capture has no clear time", () => {
    const result = parseCriticalCommitment("Eagle, don't let me forget to call the landlord before Friday");
    expect(result.ambiguous).toBe(true);
    expect(result.deadline).toBeNull();
  });
});

describe("checkpoint acknowledgment and escalation (FR-G3)", () => {
  it("marks a checkpoint acknowledged and stamps the time", () => {
    const [checkpoint] = buildCriticalCheckpoints(new Date("2026-09-20T18:30:00"));
    const acknowledged = acknowledgeCheckpoint(checkpoint, new Date("2026-09-19T18:30:00.000Z"));
    expect(acknowledged.status).toBe("acknowledged");
    expect(acknowledged.acknowledgedAt).toBe("2026-09-19T18:30:00.000Z");
  });

  it("does not flag a pending checkpoint for escalation before its due time", () => {
    const [checkpoint] = buildCriticalCheckpoints(new Date("2026-09-20T18:30:00"));
    const before = new Date(checkpoint.dueAt).getTime() - 1000;
    expect(shouldEscalate(checkpoint, before)).toBe(false);
  });

  it("flags a pending checkpoint for escalation once its due time has passed", () => {
    const [checkpoint] = buildCriticalCheckpoints(new Date("2026-09-20T18:30:00"));
    const after = new Date(checkpoint.dueAt).getTime() + 1000;
    expect(shouldEscalate(checkpoint, after)).toBe(true);
  });

  it("never re-escalates an already-acknowledged checkpoint", () => {
    const [checkpoint] = buildCriticalCheckpoints(new Date("2026-09-20T18:30:00"));
    const acknowledged = acknowledgeCheckpoint(checkpoint);
    const after = new Date(checkpoint.dueAt).getTime() + 1000;
    expect(shouldEscalate(acknowledged, after)).toBe(false);
  });

  it("escalates a pending checkpoint without acknowledging it", () => {
    const [checkpoint] = buildCriticalCheckpoints(new Date("2026-09-20T18:30:00"));
    expect(escalateCheckpoint(checkpoint).status).toBe("escalated");
  });

  it("converts an unacknowledged checkpoint to missed once the commitment deadline itself passes", () => {
    const deadline = new Date("2026-09-20T18:30:00");
    const [, threeHours] = buildCriticalCheckpoints(deadline);
    const escalated = escalateCheckpoint(threeHours);
    const pastDeadline = deadline.getTime() + 1000;
    expect(expireUnacknowledged(escalated, deadline.toISOString(), pastDeadline).status).toBe("missed");
  });

  it("leaves an acknowledged checkpoint alone even after the deadline passes", () => {
    const deadline = new Date("2026-09-20T18:30:00");
    const [, threeHours] = buildCriticalCheckpoints(deadline);
    const acknowledged = acknowledgeCheckpoint(threeHours);
    const pastDeadline = deadline.getTime() + 1000;
    expect(expireUnacknowledged(acknowledged, deadline.toISOString(), pastDeadline).status).toBe("acknowledged");
  });
});

describe("cascade status rollup", () => {
  it("reports 'none' when there are no checkpoints", () => {
    expect(cascadeStatus([])).toBe("none");
  });

  it("reports 'open' while any checkpoint is still pending or escalated", () => {
    expect(cascadeStatus(buildCriticalCheckpoints(new Date("2026-09-20T18:30:00")))).toBe("open");
  });

  it("reports 'clear' once both checkpoints are acknowledged", () => {
    const checkpoints = buildCriticalCheckpoints(new Date("2026-09-20T18:30:00")).map((c) => acknowledgeCheckpoint(c));
    expect(cascadeStatus(checkpoints)).toBe("clear");
  });

  it("reports 'missed' if either checkpoint expired unacknowledged, even if the other was acknowledged", () => {
    const [dayBefore, threeHours] = buildCriticalCheckpoints(new Date("2026-09-20T18:30:00"));
    const mixed = [acknowledgeCheckpoint(dayBefore), { ...threeHours, status: "missed" as const }];
    expect(cascadeStatus(mixed)).toBe("missed");
  });
});
