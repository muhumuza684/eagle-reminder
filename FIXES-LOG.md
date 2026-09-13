# Market-Readiness Fixes — Tier Plan & Log

## Tiers

**Tier 1 — cheap, no schema changes, direct trust impact**
1. ✅ Error handling on cloud mutations — done, see below
2. ✅ Rate limiting on mutations + `quotes.generate` — done, see below
3. ✅ `commitments.delete` endpoint — done, see below
4. ✅ Loading/pending states in the UI — done, see below

**Tier 2 — needs schema or infra changes**
5. ⬜ `timezone`/`language` on `users`
6. ⬜ Soft-delete + audit trail on commitments/checkpoints
7. ⬜ Ownership/cross-user access test
8. ⬜ Structured logging on sync/scheduling/escalation

**Tier 3 — bigger scope, design or platform work**
9. ⬜ Onboarding/empty-state education
10. ⬜ Conflict resolution for commitment sync (local vs. cloud)
11. ⬜ History/calendar view beyond "today"
12. ⬜ Production push delivery, device validation, auth entry UX

## Tier 1, #1 — done

**The bug, found during this fix, bigger than "add error handling":**
`lib/commitment-parser.ts` generates local commitment ids as
`Date.now().toString()` — a client-side timestamp, not the server's real
row id. `commitments.create` returns the server's actual autoincrement id,
but nothing in `index.tsx` ever captured it and remapped the local
commitment's id. Since a 13-digit timestamp string still matches
`/^\d+$/`, `update()`'s guard passed and sent the *client's timestamp* to
the server as if it were the row id. The server's `WHERE id = ...` matched
zero rows — the update "succeeded" with nothing changed, no error thrown.
**Every status change, reschedule, or critical-flag toggle made on a
commitment in the same session it was created was silently vanishing**,
in all four AI-authored versions of this codebase. It only self-healed the
next time `cloudCommitments` happened to refetch and overwrite local state
with real server ids.

**What changed in `index.tsx`:**
- `remapCommitmentId(oldId, newId)` — on a successful create, swaps the
  commitment's local id for the server's real id everywhere it's used as a
  key: the `commitments` array, the `checkpoints` map, and
  `criticalNotificationIds`.
- Every `createCloudCommitment.mutate(...)` call now has
  `onSuccess: (serverId) => remapCommitmentId(...)`.
- Every cloud mutation (`create` and `update`) now has an explicit
  `onError` that sets a new `syncFailed` flag on the affected commitment
  and surfaces a toast — instead of failing identically to success.
- A small `cloud-offline-outline` icon appears on a card when
  `syncFailed` is true.
- A retry pass piggybacks on the existing 30-second tick: any commitment
  still marked `syncFailed` gets its create or update re-attempted
  (whichever is appropriate, judged by whether its id still looks like a
  13-digit timestamp vs. a real small server id — a heuristic, flagged
  in-code as one, since there's no dedicated field distinguishing "local
  temp id" from "confirmed server id" yet).

**Known follow-up, not fixed here:** the temp-id-vs-server-id heuristic
(id string length) is a reasonable stopgap but not a real invariant. A
cleaner fix later: track a dedicated `synced: boolean` (or store the two
ids separately) instead of inferring it from digit count.

**Verified:** brace/paren/bracket balance checked; `tsc --noEmit` run in
isolation (module-resolution and implicit-`any` noise from not having the
full repo filtered out, as in prior rounds) — no real syntax errors.

## Tier 1, #2 — done

**Added `server/rateLimit.ts`** — a `rateLimited(key, limit, windowMs)`
helper that wraps `protectedProcedure` via tRPC's standard `.use()`
middleware chaining, so it needed no changes to `_core/*` (platform-managed,
per the existing convention in this repo). Per-user, per-endpoint
fixed-window counters in memory.

**Applied to:**
- `quotes.generate` — 5/minute. Tightest limit, since this is the one
  endpoint that calls out to an LLM per invocation and is the real cost
  exposure identified in the market-readiness review.
- `commitments.create` — 40/minute. Generous relative to the product's own
  6/day capture limit, but bounded against scripted abuse — and generous
  enough to not false-positive against the Tier 1 #1 retry loop, which can
  legitimately re-fire a failed create every 30s tick.
- `commitments.update` — 90/minute. Same reasoning; also needs headroom for
  the same retry loop potentially updating several `syncFailed` commitments
  in one tick.
- `checkpoints.update` — 60/minute.

**Known limitation, documented in `rateLimit.ts` itself:** this is an
in-memory, single-process counter. Correct for one server instance; not
correct behind multiple instances, since each process has its own map. The
call sites in `routers.ts` won't need to change when that's fixed — only
`rateLimit.ts`'s internals swap to a shared store (Redis `INCR`+`EXPIRE` is
the standard pattern).

**Verified:** brace/paren/bracket balance and `tsc --noEmit` on both
`server/routers.ts` and `server/rateLimit.ts` (module-resolution/implicit-
`any` noise from the incomplete repo filtered out, as in prior rounds) —
no real syntax errors.

## Tier 1, #3 — done

**A commitment could previously never be deleted, only reassigned a
status.** Added:
- `db.deleteUserCommitment(userId, id)` — scoped to `userId` so a user can
  only ever delete their own row; explicitly cascades to that commitment's
  checkpoints first (no DB-level FK cascade is declared in `schema.ts`).
- `commitments.delete` procedure — rate-limited (30/min) like the other
  mutations.
- `removeCommitment(commitment)` in `index.tsx` — tears down every piece of
  local state a commitment can be referenced from (the commitments list,
  the `checkpoints` map, any scheduled local notification ids) and calls
  the cloud delete if the commitment has a real server id.
- A tap-to-arm, tap-again-to-confirm "Delete this commitment" action in the
  detail sheet (`deleteConfirmId` state, reset whenever a different — or
  the same — commitment sheet is reopened) — avoids a separate confirmation
  modal for a destructive action while still requiring a deliberate second
  tap.

**Known, deliberately unhidden gap:** unlike create/update, a failed cloud
delete doesn't get picked up by the Tier 1 #1 retry loop — the item is
already gone locally, so there's nothing left in local state to retry from.
The user-facing message says exactly that ("may still exist — worth
checking when back online") rather than falsely promising a retry.

## Tier 1, #4 — done

Loading/pending states added in the three places that had none:

- **Today (`index.tsx`):** the empty state ("Your radar is clear") no
  longer fires during the first cloud fetch — a genuine loading spinner
  shows instead, so a slow connection doesn't look identical to "nothing
  captured." The capture send button now disables and shows a spinner
  while `commitments.create` is in flight, closing a double-submit window
  that existed before.
- **Review (`review.tsx`):** same first-load-vs-genuinely-empty
  distinction. While fixing this, found and closed the same silent-failure
  gap Tier 1 #1 fixed in `index.tsx` — `applyStatus`'s cloud mutation had
  no `onError` at all. Given a small local `syncNotice` banner instead of
  full per-item `syncFailed` badges (kept lighter-weight than `index.tsx`
  since this screen is transient by design).
- **Settings (`settings.tsx`):** the hydration guard rendered a bare empty
  `<View />` while local preferences loaded — now shows an
  `ActivityIndicator`.

**Verified:** brace/paren/bracket balance and `tsc --noEmit` on `index.tsx`,
`review.tsx`, and `settings.tsx` (module-resolution/implicit-`any` noise
from the incomplete repo filtered out, as in prior rounds) — no real syntax
errors in any of the three.

---

# Tier 1 — complete (4/4)

## Tier 2, #5 — done

Added `timezone` (IANA zone name, e.g. "Africa/Kampala" — not a raw UTC
offset, since offsets shift with DST) and `language` to `users`, both with
safe defaults so existing/unrelated call sites into `upsertUser` (e.g.
whatever the platform-managed login flow already calls) keep working
unchanged. Rather than trying to thread these through login, added a
dedicated `auth.updateLocale` mutation and a client-side effect that
reports `Intl.DateTimeFormat().resolvedOptions().timeZone` once per
session — fire-and-forget, since a failure here just means the server's
stored value stays stale until next launch, never blocking the user.

This directly unblocks correct behavior for the known P1 gap (production
push delivery needs to know "8am local" server-side rather than relying on
the device's own clock).

## Tier 2, #6 — done

`commitments.delete` (Tier 1 #3) was a hard delete. Added `deletedAt` to
both `commitments` and `criticalCheckpoints`; `deleteUserCommitment` now
sets it instead of removing the row, and every read query
(`getUserCommitments`, `getCommitmentCheckpoints`, `getUserCheckpoints`)
filters `isNull(...deletedAt)`. Added `restoreUserCommitment` (undo path,
not wired to a UI action yet) and `purgeSoftDeletedCommitments` (genuine
permanent removal after a retention window — not called by anything yet,
since there's no periodic-job infrastructure to call it from; that's the
same gap noted for structured logging below).

One deliberate asymmetry, documented in `schema.ts`: `clearCriticalCheckpoints`
(removing a critical flag) now soft-deletes, but `replaceCriticalCheckpoints`
(a deadline change) still hard-deletes its stale rows — that's a genuine
replace operation, not a user-facing delete, so there's no audit value in
keeping those rows around.

## Tier 2, #7 — done, with an honest limitation

There's no live database in this environment (or, per the Feature Audit,
likely in CI yet either) to run a real integration test against. What's
actually possible without one, and what I did: `server/db.ownership.test.ts`
is a static check that inspects every `db.ts` function's own source and
confirms it still scopes its query by the right `userId`/`users.id`
column — it catches the regression that matters most (someone editing
`db.ts` and dropping the ownership filter), but it does not prove the SQL
truly excludes another user's row at runtime. The file also contains a
documented, currently-`skip`ped real integration-test skeleton (seed two
users, have one attempt to read/update/delete the other's commitment,
assert nothing is returned/affected) ready to enable once a
`TEST_DATABASE_URL` exists.

**Actually run, not just written:** installed vitest and executed this
suite directly. First run caught a real bug in the test's own brace-matching
helper (it grabbed a parameter's object-type literal instead of the
function body for two functions) — fixed, re-ran, all 13 assertions pass.
Ran alongside the existing `critical-cascade` and `warning-overrides`
suites: 36/36 passing.

## Tier 2, #8 — done

Added `server/logger.ts` — one `log()` function, structured JSON lines to
stdout. Deliberately not a logging-platform integration (Datadog/Sentry/
CloudWatch/etc.) — it's the seam those plug into later without touching
any call site. Wired into:
- `rateLimit.ts` — logs a `warn` when a user actually hits a limit (not
  every request under it — that would just be noise).
- `commitments.create` / `commitments.delete` — `info`, with `userId` and
  `commitmentId`.
- `checkpoints.update` — `info` for "acknowledged" (the everything's-fine
  case), `warn` for "escalated"/"missed" — the two states the product's
  entire trust-latency thesis depends on being provable, not just
  user-reported.

**Known follow-up, not fixed here:** this makes failures *loggable*, not
yet *alertable* — there's still no periodic job or monitoring pipeline
consuming these logs (same underlying gap `purgeSoftDeletedCommitments`
above is waiting on). That's real platform/ops work, not something this
codebase can close on its own.

---

# Tier 2 — complete (4/4)

Next up: Tier 3 (onboarding/empty-state education, conflict resolution for
commitment sync, history/calendar view, and the known big P1s — production
push delivery, device validation, auth entry UX).

## Tier 3, #9 — done

First-run onboarding: four short slides (`ONBOARDING_SLIDES`) covering the
mechanism, not every screen — matching the product's own "silence is a
feature" instinct rather than a long feature tour. Gated on a local
`deagle-onboarded-v1` flag, shown once, skippable at any point. Added a
"Show the intro again" row in Settings under a new HELP section that
resets the flag.

## Tier 3, #10 — done (a second, related correctness bug found and fixed)

Same class of bug as Tier 1 #1, one layer up: `index.tsx`'s effect that
reacts to a `commitments.list` refetch was a **wholesale replace** —
`setCommitments(cloudCommitments.data.map(...))` — on every successful
fetch. That silently discarded any commitment captured locally but not yet
synced (still on a client-timestamp id), and any local edit that had
failed to sync (Tier 1 #1's `syncFailed` flag) in favor of the now-stale
cloud copy, undoing the whole point of that flag.

Fixed with `lib/commitment-sync.ts` — a pure, framework-free
`mergeCommitments()` function (same pattern as `critical-cascade.ts`):
cloud wins for normally-synced items (so multi-device sync actually
works), local wins when `syncFailed` is set, and unsynced local items are
always kept since the cloud has no idea they exist yet. Also added a
`suppressedIdsRef` in `index.tsx`, populated by `removeCommitment` (Tier 1
#3), so a commitment deleted locally this session is never resurrected by
a cloud refetch that hasn't caught up with the delete.

**Actually run:** 10 new tests in `lib/commitment-sync.test.ts`, including
a realistic mixed-batch case (one unsynced capture, one failed edit, one
clean sync, one cloud-only item from another device, one suppressed
delete, all in the same merge call) — all passing on first run.

## Tier 3, #11 — done (a bigger, previously invisible gap found while building this)

Started as "add a history/calendar view." What it actually required first:
**Today's list (`active` in `index.tsx`) had zero date scoping at all.**
The client never stored `scheduledDate` on a commitment after creating it
— it computed `new Date().toISOString().slice(0,10)` only for the payload
sent to the server, then discarded it. `active` filtered purely on
`status`. That means "Today" was actually showing *every unresolved
commitment from the account's entire history*, and — more seriously — the
6-commitment daily cap (which reuses `active`) was counting all-time
unresolved items, not today's, since nothing scoped it to a single day.
`review.tsx` had the identical gap on its own separate commitments list.

Fixed at the root: added `scheduledDate` to `commitment-parser.ts`'s
`ParsedCommitment` (the base app file, modified — see its own header
comment) and to the client-side `Commitment` / `SyncableCommitment` /
`CloudCommitmentRow` types, then scoped `active` (and by reuse, the 6-limit
swap check) to `item.scheduledDate === todayKey`. `review.tsx`'s buckets
are now scoped to today the same way — and now that `review.tsx` reuses
`SyncableCommitment` directly (dropped its own near-duplicate
`ReviewCommitment` type) instead of duplicating it, it got Tier 3 #10's
merge fix applied to its own cloud-sync effect for free, closing the same
wholesale-replace bug there too.

**With that fixed, the actual history feature:** a "Past days" section in
Review — everything that isn't today, grouped by date, most recent first,
capped at 14 days, one date expandable at a time (matching the product's
progressive-disclosure pattern rather than a full calendar UI).

**Known, smaller follow-up not fixed here** (flagged in
`commitment-parser.ts`'s own comment): the parser strips "today"/"tomorrow"
as noise words but doesn't act on them — "call mom tomorrow at 5pm" still
schedules for today. Separate gap (natural-language date parsing) from the
one this fix addresses.

**Also flagged, not fixed:** `today`/`todayKey` in `index.tsx` are computed
once at module load, not per-render — a session left open across midnight
won't roll over. Pre-existing, unrelated to this fix, noted rather than
silently left implicit.

## A methodology note, surfaced while working on #10/#11

Every "no real syntax errors" claim in this log and in prior rounds was
checked with `tsc` run on a single file in isolation. That's meaningful for
catching syntax errors and self-contained type issues, but **an
unresolvable local import (e.g. `@/lib/commitment-sync`) silently resolves
to `any`** in that mode — meaning cross-file type mismatches between, say,
`index.tsx`'s calls into `commitment-sync.ts` were never actually
type-checked against each other by any verification step so far. This
isn't specific to Tier 3; it's been true of every "verified with tsc"
claim in every round. A real fix needs a proper multi-file `tsconfig.json`
+ path-alias resolution (this repo's actual one, which isn't included in
any of the uploaded flattened exports) run against the whole `merged/`
tree at once — noted as a genuine gap in verification confidence, not
papered over.

## Tier 3, #12 — honest assessment, not a fix

The three items grouped here in the original tier plan are not equally
implementable inside this environment:

- **Auth entry UX** — genuinely implementable (pure client UI, no external
  infra) but **not attempted this round** — ran out of scope for this
  session. Next up if this thread continues.
- **Production push delivery** (APNs/FCM server-side jobs, retry, token
  lifecycle) — needs real push credentials and a running job
  scheduler/queue. What's honestly buildable without those: the
  *architecture* (a job interface, a token-registration table, a retry
  queue design) — not attempted this round since a design document without
  working code risks looking more finished than it is.
- **Physical device validation** — cannot be done in this environment at
  all. No amount of code changes substitutes for running on real iOS/
  Android hardware. Still exactly what `NATIVE_VALIDATION_CHECKLIST.md` /
  `DEVICE-VALIDATION.md` describe: unstarted.

---

# Tier 3 — 3/4 done (#9, #10, #11). #12 is genuinely infra/hardware-gated; see above for what's actually left open.

## Tier 3, #12 — all three built

### Production push delivery

The client already called `Notifications.getExpoPushTokenAsync()`
(`lib/native-services.ts`) — meaning the right architecture is the **Expo
push service**, not raw APNs/FCM. It needs no separate certificate/key
management: Expo brokers to APNs/FCM using the app's push credentials
already configured at EAS build time. Built:

- `pushTokens` table (one row per device, so a user with two phones gets
  both) + migration.
- `server/pushSchedule.ts` — pure, timezone-aware "who's due right now"
  logic (`selectDuePushes`), using Tier 2 #5's `users.timezone` to compute
  each user's actual local hour via `Intl.DateTimeFormat`, not the
  server's. 11 tests, including real DST/timezone-offset cases
  (`Africa/Kampala`, `America/New_York`) — all passing on first run.
- `server/pushDelivery.ts` — real send logic against the **actual
  installed `expo-server-sdk`**, not a stub: chunking, ticket-based
  send-failure logging, and receipt-based pruning of tokens Expo reports
  as `DeviceNotRegistered` (the standard pattern — without it, a token
  from an uninstalled app gets retried forever).
- `server/pushJob.ts` — the orchestrator (`runScheduledPushJob`) tying
  scheduling + content + delivery + marking-sent + pruning together.
- `notifications.registerToken` / `unregisterToken` router endpoints, and
  — found in the process — `registerForNotifications()` was **defined but
  never actually called anywhere in `index.tsx`**; the whole push-token
  flow was dead code. Wired it up as a fire-and-forget effect.

**Genuinely stronger verification than anything else in this project:**
`pushDelivery.ts` was type-checked against the real installed
`expo-server-sdk` package (not filtered/stubbed) — zero errors, zero
warnings, completely clean output. This is the one file in the whole
merged package checked against real third-party types rather than
resolving unknown imports to `any`.

**Deliberately out of scope:** checkpoint escalation via server push (the
app already covers "app closed" for checkpoints reasonably well via local
notifications scheduled at capture time — see the updated
`NATIVE_VALIDATION_CHECKLIST.md` §2.10 for the reasoning). The
open-commitment count used in push body copy uses the job's own UTC "today"
rather than each user's local day (flagged in `pushJob.ts` itself, not
silently accepted) — a small, well-scoped follow-up. And — same underlying
gap as `purgeSoftDeletedCommitments` (Tier 2 #6) and the "no periodic job"
follow-up (Tier 2 #8) — **nothing in this codebase actually invokes
`runScheduledPushJob()` on a schedule yet**, because there's no
job-scheduler infrastructure in any of the uploaded exports. The function
is genuinely ready to run the moment that exists; it just doesn't exist
here.

### Auth entry UX

`components/auth-gate.tsx` — a real, complete `AuthGate` wrapper: shows a
Welcome screen (sign in / continue as guest, with a clear one-line
explanation of what guest mode does and doesn't do) on first launch,
remembers the choice locally the same way onboarding does (Tier 3 #9), and
renders the app normally on every subsequent launch. Built entirely on
`useAuth()`/`startOAuthLogin()` — the same hooks already proven working in
`settings.tsx`, not new/speculative auth code.

**One honest limitation:** `app/_layout.tsx` isn't part of any of the four
uploaded exports (it's platform-scaffolded), so this component can't wire
itself around the root layout — that's a two-line change documented at the
bottom of the file itself, not a separate guide, since it's genuinely that
small once you have that file open.

### Device validation

Cannot be done in this environment — no physical hardware, full stop. What
IS honestly buildable: `docs/NATIVE_VALIDATION_CHECKLIST.md` is a
substantially updated version of the existing checklist, reflecting
everything built across all three tiers (rows marked **NEW**) rather than
the pre-Tier-1 checklist that predates push delivery, onboarding, delete,
and the history view entirely. §2's old "known gap" note is updated to
reflect what Tier 3 #12 actually closed (the daily ritual) versus what it
deliberately didn't (checkpoint escalation) rather than leaving a stale gap
note in place.

---

# Tier 3 — complete (4/4). All three tiers now fully addressed, with every
genuine limitation (infra-gated, hardware-gated, or a real follow-up)
flagged explicitly rather than papered over. See this file's methodology
note above for the one thing worth re-verifying with a real multi-file
tsconfig before shipping: cross-file type-checking hasn't been possible in
this environment beyond what `expo-server-sdk`'s real installed types
allowed for `pushDelivery.ts`.
