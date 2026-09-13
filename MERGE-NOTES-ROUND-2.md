# Round 2 — integrating two full-app builds

Two more uploads, `d-eagle-hub-full-app.zip` and `d-eagle-hub-complete.zip`,
turned out to be the same two lineages from round 1 (see `MERGE-NOTES.md`),
each independently carried all the way to a real, complete `index.tsx` —
not just diffs this time. That's exactly what round 1's
`UI-INTEGRATION-GUIDE.md` said was needed before a confident splice was
possible, so this round does the actual splice for real.

## What each one turned out to be

- **`d-eagle-hub-full-app.zip`** ("d_full") — the **next-sequence** lineage
  carried forward on its own: full natural-language "don't let me forget"
  capture with the ambiguous-deadline prompt, real cloud sync of
  `criticalDeadline`/`warningMuted` (previously silently dropped — its own
  README flagged this), and — genuinely new this round — it caught and fixed
  a real bug neither round-1 patch had touched: **the Review tab
  (`app/(tabs)/review.tsx`) was running on hardcoded demo data**, completely
  separate from the real commitments shown on Today. It rewrote that screen
  to read the actual on-device + cloud commitment list. It still has no
  acknowledge/escalate/expire state machine at all — checkpoints only ever
  move from unacknowledged to acknowledged via a tap, with no automatic
  escalation or "missed" state.

- **`d-eagle-hub-complete.zip`** ("e_complete") — the **section7** lineage
  carried forward on its own: the full FR-G3 state machine wired into
  `index.tsx` (30-second tick, escalate, expire, cascade-status badges on
  Today and in its own in-app review modal, a per-checkpoint acknowledge
  list in the commitment sheet). It never touched `review.tsx` at all — that
  screen is still on hardcoded demo data in this build. It also has no
  natural-language deadline parsing — a critical commitment's deadline is
  assumed to already be known.

Same story as round 1: neither is a superset, each is missing exactly what
the other has. This round's job was mechanical rather than diagnostic —
splice two complete, working files instead of reconciling two partial diffs.

## What was actually spliced into `index.tsx`

Base: d_full's file (it's the richer one — voice capture, meeting
integration, snapshot recording, the capture/ambiguity flow). Grafted in
from e_complete:

- `checkpoints` state (`Record<string, Checkpoint[]>`), hydrated from and
  persisted to `AsyncStorage` under `deagle-checkpoints-v1`.
- The 30-second escalate/expire pass — **not** a second timer: it hooks into
  the `now` state that already ticks every 30s for meeting countdowns, via
  its own `useEffect` keyed on `[now, commitments, isAuthenticated]`.
- `cascadeCopy` label helper, the flag-icon color and status line on each
  Today card, and the same summary inside the in-app quick review modal.
- The per-checkpoint acknowledge list in the commitment detail sheet
  (`acknowledgeCommitmentCheckpoint`).
- Checkpoints are now actually seeded into that state when a commitment is
  flagged critical (`commitCritical`), and cleared when the flag is removed
  — neither original build did the second part on its own.
- One naming collision fixed in the process: `commitCritical` had a local
  `const checkpoints = buildCriticalCheckpoints(...)` that would have shadowed
  the new state variable of the same name — renamed to `builtCheckpoints`.

## `review.tsx`: which base, which fix

Base is d_full's real-data rewrite (this is the version that actually reads
real commitments — worth keeping regardless of the checkpoint model). Only
change: swapped its checkpoint acknowledge wiring from a boolean
`acknowledged` field + a separate `checkpoints.acknowledge` mutation to the
merged status-enum model (`item.status !== "acknowledged"` /
`checkpoints.update.mutate({ id, status })`), matching `schema.ts` and
`routers.ts` from round 1.

## A gap found in the process — flagged, not silently patched over

Both original builds' escalate/acknowledge code sends the **commitment's**
id to a cloud mutation that expects the **checkpoint row's own** id in the
`criticalCheckpoints` table — two different tables' autoincrement
sequences. e_complete's own code even has a `void checkpointUpdateCloud;`
line acknowledging this was never wired up. Firing that call anyway would
silently update whatever row happens to share that numeric id — a real,
if quiet, data-corruption risk had it been "fixed" naively during the
splice.

Fix applied: local state is updated correctly (which is what actually
silences future escalation and reflects in the UI), the voice alert fires
correctly, and the cloud sync of *this specific transition* is left
deliberately unwired with a comment explaining exactly why — matching
e_complete's own honest choice rather than papering over it. The real fix
(tracking each checkpoint's server-assigned id client-side, e.g. by having
`commitments.create`/`checkpoints.listForCommitment` return it and storing
it alongside `dueAt`/`status` in the `checkpoints` state) is a small,
well-scoped follow-up — flagged in both `index.tsx` and here rather than
left implicit.

## Verification done on this round

Both `index.tsx` and `review.tsx` were run through `tsc --noEmit` in
isolation (no access to the real project's other files, so module-not-found
and implicit-`any` noise is expected and was filtered out). No real syntax
errors in either file. Brace/paren balance was also checked directly.
This is not a substitute for compiling against your actual repo — do that
first, per `UI-INTEGRATION-GUIDE.md`'s suggested order — but it does rule
out the most common failure mode of a hand-spliced file (a dropped brace or
mismatched JSX tag).

## Updated status against the original Feature Audit

d_full's `docs/Feature-Audit.md` still shows its *pre-Section-7* status —
it predates both lineages being built out, so it still lists "the exact
two-checkpoint flow" and "persist warning overrides server-side" as P0
gaps. After this round's merge, both are actually done. What's genuinely
still outstanding, confirmed across every source in both rounds — nobody
has touched these:

- **Physical device validation** (`NATIVE_VALIDATION_CHECKLIST.md` /
  `DEVICE-VALIDATION.md` — both still just checklists, not completed runs).
  Nothing in text can substitute for this.
- **Production push delivery** (APNs/FCM server-side jobs, retries, token
  lifecycle) — every build only schedules *local* notifications; there is
  no server-side delivery path anywhere in any of the four uploads so far.
- **First-launch auth entry UX** — sign-in exists and is wired into
  protected procedures, but there's no dedicated onboarding/auth-choice
  screen in any build.
- **The checkpoint-id gap above** — new to this round, small, well-scoped.

## What's in the updated package

Everything from round 1, plus:
- `index.tsx` — the real, spliced file (was previously guide-only)
- `review.tsx` — replaced with the real-data version, status-enum wiring
- `UI-INTEGRATION-GUIDE.md` from round 1 is now superseded for `index.tsx`
  and `review.tsx` specifically — both are finished files now. It's kept in
  the package as a record of the reasoning, not because it's still needed.
