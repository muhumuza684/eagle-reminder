import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

// Tier 2 #7 — "prove cross-user access is denied."
//
// HONEST LIMITATION: there is no live database available in this
// environment (or, likely, in most CI runs for this project yet — see
// FIXES-LOG.md). A *real* test for this requirement seeds two users, has
// user B attempt to read/update/delete a commitment that belongs to user A
// via each db.ts function, and asserts nothing is returned/affected. That
// test needs an actual MySQL instance (or testcontainers) to run against
// and is written as a documented, currently-skipped skeleton at the bottom
// of this file — enable it once `TEST_DATABASE_URL` exists in CI.
//
// What CAN run right now, with zero infrastructure: a static check that
// every db.ts function taking a `userId` parameter actually uses it to
// scope its query, by inspecting the function's own source text. This
// doesn't prove the SQL is correct at runtime, but it does catch the
// specific regression that matters most here — someone editing db.ts and
// accidentally dropping the `eq(<table>.userId, userId)` clause, which is
// the only thing standing between users in this schema (no row-level
// security at the DB layer, no ORM-level tenant scoping — just this).

const dbSource = readFileSync(join(__dirname, "db.ts"), "utf8");

function bodyOf(fnName: string): string {
  const marker = `export async function ${fnName}(`;
  const start = dbSource.indexOf(marker);
  if (start === -1) throw new Error(`function ${fnName} not found in db.ts — this test is out of sync with the file it's guarding`);
  // Find the end of the parameter list first (paren-depth matching) —
  // params can themselves contain object-type literals with their own
  // `{...}`, e.g. `data: Partial<{ stage: "..."; dueAt: Date }>`, so
  // jumping straight to "the next {" after the function name grabs the
  // wrong brace for those functions.
  const parenStart = start + marker.length - 1;
  let parenDepth = 0;
  let parenEnd = -1;
  for (let i = parenStart; i < dbSource.length; i++) {
    if (dbSource[i] === "(") parenDepth++;
    if (dbSource[i] === ")") { parenDepth--; if (parenDepth === 0) { parenEnd = i; break; } }
  }
  if (parenEnd === -1) throw new Error(`could not find the end of ${fnName}'s parameter list`);
  const braceStart = dbSource.indexOf("{", parenEnd);
  let depth = 0;
  for (let i = braceStart; i < dbSource.length; i++) {
    if (dbSource[i] === "{") depth++;
    if (dbSource[i] === "}") { depth--; if (depth === 0) return dbSource.slice(braceStart, i + 1); }
  }
  throw new Error(`could not find the end of function ${fnName} — unbalanced braces?`);
}

describe("ownership scoping — static source check (see file header for why this isn't a live-DB test yet)", () => {
  it("getUserCommitments filters by commitments.userId", () => {
    expect(bodyOf("getUserCommitments")).toMatch(/eq\(commitments\.userId,\s*userId\)/);
  });
  it("updateUserCommitment scopes its WHERE by commitments.userId", () => {
    expect(bodyOf("updateUserCommitment")).toMatch(/eq\(commitments\.userId,\s*userId\)/);
  });
  it("deleteUserCommitment scopes both the commitment and its checkpoints by userId", () => {
    const body = bodyOf("deleteUserCommitment");
    expect(body).toMatch(/eq\(commitments\.userId,\s*userId\)/);
    expect(body).toMatch(/eq\(criticalCheckpoints\.userId,\s*userId\)/);
  });
  it("restoreUserCommitment scopes both tables by userId", () => {
    const body = bodyOf("restoreUserCommitment");
    expect(body).toMatch(/eq\(commitments\.userId,\s*userId\)/);
    expect(body).toMatch(/eq\(criticalCheckpoints\.userId,\s*userId\)/);
  });
  it("getCommitmentCheckpoints filters by criticalCheckpoints.userId", () => {
    expect(bodyOf("getCommitmentCheckpoints")).toMatch(/eq\(criticalCheckpoints\.userId,\s*userId\)/);
  });
  it("getUserCheckpoints filters by criticalCheckpoints.userId", () => {
    expect(bodyOf("getUserCheckpoints")).toMatch(/eq\(criticalCheckpoints\.userId,\s*userId\)/);
  });
  it("replaceCriticalCheckpoints scopes its delete by userId before inserting the replacement rows", () => {
    expect(bodyOf("replaceCriticalCheckpoints")).toMatch(/eq\(criticalCheckpoints\.userId,\s*userId\)/);
  });
  it("clearCriticalCheckpoints scopes by userId", () => {
    expect(bodyOf("clearCriticalCheckpoints")).toMatch(/eq\(criticalCheckpoints\.userId,\s*userId\)/);
  });
  it("updateCheckpoint scopes by criticalCheckpoints.userId — not just the checkpoint's own row id", () => {
    expect(bodyOf("updateCheckpoint")).toMatch(/eq\(criticalCheckpoints\.userId,\s*userId\)/);
  });
  it("getUserSnapshots filters by weeklySnapshots.userId", () => {
    expect(bodyOf("getUserSnapshots")).toMatch(/eq\(weeklySnapshots\.userId,\s*userId\)/);
  });
  it("upsertUserSnapshot scopes its existing-row lookup by weeklySnapshots.userId", () => {
    expect(bodyOf("upsertUserSnapshot")).toMatch(/eq\(weeklySnapshots\.userId,\s*data\.userId\)/);
  });
  it("getUserPreferences and upsertUserPreferences scope by userPreferences.userId", () => {
    expect(bodyOf("getUserPreferences")).toMatch(/eq\(userPreferences\.userId,\s*userId\)/);
    expect(bodyOf("upsertUserPreferences")).toMatch(/eq\(userPreferences\.userId,\s*userId\)/);
  });
  it("updateUserLocale scopes by the user's own id, not an unrelated column", () => {
    expect(bodyOf("updateUserLocale")).toMatch(/eq\(users\.id,\s*userId\)/);
  });
  it("unregisterPushToken scopes by pushTokens.userId in addition to the token value, so a guessed token alone isn't enough", () => {
    expect(bodyOf("unregisterPushToken")).toMatch(/eq\(pushTokens\.userId,\s*userId\)/);
  });
  // Not covered above, deliberately: registerPushToken (writes under the
  // caller's own ctx.user.id, which is trusted router context, not
  // user-supplied input — nothing to guess or spoof), and
  // getPushCandidates/markBriefingSent/markReviewSent/deletePushTokenByValue
  // (internal to the scheduled job in pushJob.ts, never exposed through a
  // per-user router endpoint, so "scoped by userId" doesn't apply the same
  // way it does to a user-facing read/update/delete).
});

// --- Real integration test skeleton — enable once a test DB exists -------
//
// To turn this on: provide `TEST_DATABASE_URL` (a disposable MySQL schema,
// e.g. via testcontainers or a CI-only database), run migrations against
// it, then flip `describe.skip` to `describe`.
//
// import * as db from "./db";
//
// describe.skip("ownership scoping — live integration test", () => {
//   let userAId: number;
//   let userBId: number;
//   let commitmentId: number;
//
//   beforeAll(async () => {
//     // seed two users directly, bypassing upsertUser's OAuth-shaped input
//     userAId = await seedUser("test-user-a");
//     userBId = await seedUser("test-user-b");
//     commitmentId = await db.createCommitment({ userId: userAId, title: "A's commitment", category: "personal", scheduledDate: "2026-01-01", timeStart: "09:00", timeEnd: "09:30", priority: "medium", status: "active", riskState: "stable", critical: false });
//   });
//
//   it("user B cannot read user A's commitment via getUserCommitments", async () => {
//     const bList = await db.getUserCommitments(userBId);
//     expect(bList.find((c) => c.id === commitmentId)).toBeUndefined();
//   });
//
//   it("user B's update against user A's commitment id affects zero rows", async () => {
//     await db.updateUserCommitment(userBId, commitmentId, { status: "completed" });
//     const aList = await db.getUserCommitments(userAId);
//     expect(aList.find((c) => c.id === commitmentId)?.status).toBe("active"); // unchanged
//   });
//
//   it("user B's delete against user A's commitment id affects zero rows", async () => {
//     await db.deleteUserCommitment(userBId, commitmentId);
//     const aList = await db.getUserCommitments(userAId);
//     expect(aList.find((c) => c.id === commitmentId)).toBeDefined(); // still there
//   });
// });
