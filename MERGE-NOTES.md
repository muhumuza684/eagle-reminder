# D-EAGLE HUB — Merge Notes

## What these three uploads actually were

Not three versions of the same thing — three different pieces:

1. **`agu.zip`** — the actual base app. A fairly complete Expo/React Native + tRPC + Drizzle/MySQL project (auth, cloud sync, push notifications, native TTS/voice capture, a full "Signal" analytics dashboard, Zoom/Meet meeting integration, AI-personalized quotes). Also contains a **Feature Audit** that itself recommends a "Section 7" of next work: finish the exact two-checkpoint critical-commitment model, persist warning overrides and preferences server-side, then run native-device validation.

2. **`d-eagle-hub-section7.zip`** — one AI's attempt at that Section 7 recommendation, delivered as a patch set (its own README says as much: it only had the flattened files, not your real repo, so it's "a patch set, not a PR").

3. **`d-eagle-hub-next-sequence.zip`** — a **second, independent** attempt at the *same* Section 7 recommendation, from a different AI, working from the same flattened base files. Confirmed by the migration file: both use the identical filename `0002_critical_checkpoints_and_preferences.sql`.

So the real task wasn't "pick the better patch" — the two patches turned out to solve **different halves** of the same problem, each missing what the other has:

- **section7**'s code owns the checkpoint **status state machine**: acknowledge → escalate → expire, plus the cascade rollup shown on Today/Review. It assumes a deadline is already known (derived from the commitment's own scheduled time) and has no natural-language deadline parsing.
- **next-sequence**'s code owns the **natural-language capture flow**: parsing "Eagle, don't let me forget X before Y", detecting an ambiguous deadline and prompting exactly one clarifying question (FR-G4). It has no acknowledge/escalate/expire logic at all — checkpoints are just two booleans with no lifecycle.

Neither is a superset. This package merges them.

## What's in this merged package

| File | What it is |
|---|---|
| `lib/critical-cascade.ts` | Unified: section7's status state machine (`acknowledgeCheckpoint`, `shouldEscalate`, `escalateCheckpoint`, `expireUnacknowledged`, `cascadeStatus`) + next-sequence's NL parsing (`parseDeadlinePhrase`, `parseCriticalCommitment`). Fully self-contained and unit-tested — no framework dependencies. |
| `lib/critical-cascade.test.ts` | Combined test suite from both original test files, adjusted for the merged types. |
| `lib/warning-overrides.ts` + test | `resolveWarningMuted` extracted out of section7's file into its own module — it's a meeting-reminder concern, not a critical-cascade concern, so it gets single responsibility. |
| `lib/preferences.ts` | Based on next-sequence's version (it's the one that actually persists to AsyncStorage and mirrors onto the legacy single-purpose keys `index.tsx`/`dashboard.tsx` already use — section7's version was a pure type/merge-rule module with no storage, which would have silently orphaned those existing keys). |
| `lib/native-services.ts` | Full file. Base functions unchanged; the "Don't Let Me Forget" section uses next-sequence's `scheduleCriticalCascade`/`cancelCriticalCascade` pattern (returns notification ids so a removed critical flag can actually cancel them — section7's version couldn't cancel anything) plus section7's separately-named `speakCheckpointEscalation`. |
| `drizzle/schema.ts` | Full file. See "Schema reconciliation" below. |
| `drizzle/migrations/0002_critical_checkpoints_and_preferences.sql` | Regenerated to match the merged schema. |
| `server/db.ts`, `server/routers.ts` | Full files, reconciled — see "Server reconciliation" below. |
| `review.tsx` | Base file + next-sequence's "Critical checkpoints" section, adapted from booleans to the merged status enum. This one was a clean additive patch, so it's included as a finished file, not just guidance. |
| `UI-INTEGRATION-GUIDE.md` | `index.tsx` and `settings.tsx` are **not** included as finished merged files — see why below, and what to do instead. |

## Schema reconciliation (and why each side won)

| Decision | Kept | Rejected | Why |
|---|---|---|---|
| Deadline storage | next-sequence's `criticalDeadline` column on `commitments` | section7's implicit `scheduledDate + timeStart` derivation | FR-G1 is "before **Y**", and Y is not necessarily the commitment's own start time. An explicit column is also what the NL parser actually produces. |
| Checkpoint state | section7's `status` enum (`pending / acknowledged / escalated / missed`) | next-sequence's two booleans (`acknowledged`, `escalated`) | A single enum can't represent an invalid combination (e.g. both true); it also matches the state-machine functions directly, so there's one field to read and write instead of two to reconcile. |
| Stage naming | `"three_hours"` (next-sequence) | `"hours_before"` (section7) | This is what the NL parser and both UIs' capture flow already reference; renaming section7's side costs nothing since its logic used a ternary rather than a literal equality check. |
| `shareTheme` default | `"Signal"` (next-sequence) | `"classic"` (section7) | Checked against the actual app: `dashboard.tsx` defines real theme names `Signal / Dawn / Grove`. Section7 didn't have that file and guessed a name that isn't one of the real options — worth knowing since it means that patch's assumptions about files it couldn't see should be treated cautiously elsewhere too. |
| Checkpoint indexes | section7's explicit `CREATE INDEX` statements | next-sequence had none | Free correctness/performance win, no downside. |

## Server reconciliation

- `commitments.create` / `commitments.update`: kept next-sequence's version (accepts `criticalDeadline` directly from the client, since that's what the NL-parsed capture flow produces).
- `checkpoints` router: merged shape. Kept `listForCommitment` and `list` (all) from section7, but replaced next-sequence's separate `acknowledge`/`escalate` mutations with section7's single `update({ id, status })` — because the client's 30-second tick loop (section7's `index.tsx`) computes the next status locally via `shouldEscalate`/`expireUnacknowledged` and needs one endpoint to persist whatever it computed, not two.
- `preferences` router: shape from section7 (`db.upsertUserPreferences(userId, patch)`), values/defaults from next-sequence.

## Why `index.tsx` and `settings.tsx` are not included as finished files

Both patches rewrote large stretches of the same two files independently:

- **section7's `index.tsx`** adds: the 30-second escalation tick loop, local checkpoint persistence via `AsyncStorage`, the cascade-status label on Today/Review, and cloud sync via `setCritical`/`checkpoints.update`.
- **next-sequence's `index.tsx`** adds: the `showCriticalPrompt` ambiguous-deadline modal, `parseCriticalCommitment` wired into capture, and scheduling via `scheduleCriticalCascade` with cancellable notification ids.

These are genuinely complementary, not conflicting — but reconciling them means splicing two independent sets of hooks/state/effects into one 250–360 line component that also depends on other files neither patch had access to (styles, other hooks, `_core`, the real `app/_layout.tsx`, etc.). Both original patch-set READMEs were upfront that they only had flattened files, not your live repo, for exactly this reason. Fabricating a "final" merged `index.tsx` here — one I can't compile or run against your actual project — risks handing you something that looks finished but silently breaks. That's a worse outcome than a precise instruction set.

`UI-INTEGRATION-GUIDE.md` gives the exact, itemized splice instructions instead, written so you (or a coding agent with your real repo open) can apply them directly.
