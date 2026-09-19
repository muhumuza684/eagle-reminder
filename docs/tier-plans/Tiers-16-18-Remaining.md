# D-Eagle Hub — Tiers 16–18: Remaining Work (Status Update)

These were scoped earlier (see D-Eagle-Hub-Tiers-15-18-Notifications-
Monetization.md for full original detail) but never built — the
conversation moved to the single-screen redesign first. This is the
current, corrected status of each, so nothing gets rebuilt by accident.

---

## Tier 16 — Presence & Data Portability

**Status: half done already.**

- [FREE] Manual export/import to a JSON file — **already built and
  working** (`exportLocalData`/`importLocalData` in `lib/local-data.ts`,
  wired into Settings). Nothing to do here.
- [PAID] Home-screen widget showing the next commitment — **not built.**
  This is the one real remaining task in this tier. Needs a native
  Expo config plugin (widgets aren't available through the managed
  workflow alone) — scope as its own spike before committing to a
  timeline, same caution as Tier 17's native work below.

---

## Tier 17 — High-Priority Alerts (Lock Screen & Sound)

**Status: not started.**

1. [PAID] Full-screen/lock-screen Android notification for urgent
   commitments (the "full-screen intent" mechanism alarm/call apps use).
   Requires a config plugin or custom native module — outside Expo's
   managed workflow, same caution as the widget above.
2. [PAID] Custom high-priority notification sound, distinct from default.
3. [FREE — documented] iOS ceiling disclosed in Settings/About: iOS does
   not allow third-party apps to bypass silent mode outside CallKit.
   Document, don't silently fail.
4. [Not building] Powering on a fully powered-off device — confirmed
   impossible on any platform, recorded so it isn't re-raised.

---

## Tier 18 — Next-of-Kin Escalation

**Status: not started. Infrastructure already exists for it.**

Because the server was kept (Tier 13 decision) rather than deleted, this
tier is cheaper than originally scoped — the push pipeline
(`server/pushJob.ts`, `pushDelivery.ts`, `pushSchedule.ts`) and the
GitHub Actions cron already run. This tier adds one more job type to
that same pipeline rather than building new infrastructure.

1. [PAID] Contact list for escalation — name + email per contact
   (email chosen deliberately — no free automated WhatsApp sending path).
2. [PAID] Missed-response window, user-configurable.
3. [PAID] Extend the existing scheduled job to also check for missed
   critical commitments past their window and send the alert email —
   reuses `server/pushJob.ts`'s existing cron trigger, doesn't add a
   second scheduler.
4. [FREE — documented] Reliability disclosure in Settings/About: cannot
   detect or alert on a dead or fully offline phone.
5. [PAID] Configurable number of recipients per escalation.

---

## Suggested order relative to Tiers 19–20

Given 19–20 restructure the UI these features will live in (About screen
gets the iOS/reliability disclosures, avatar/Settings gets new paid rows
for widget/alerts/next-of-kin), doing 19–20 first and 16–18 after means
building the paid rows once, in their final home, rather than building
them into the old tab layout and moving them again.
