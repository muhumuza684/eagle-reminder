# D-Eagle Hub — Tiers 8–14: Full Simplification & Intelligence Plan

Continuation of `TIER-MANIFEST.md` (Tiers 1–7 = design system foundation)
and the Tier 8–12 doc already shared (platform simplification + core
usability heuristics). This version adds Tiers 13–14 (local-first, no
server, rule-based "smart" Eagle) and closes with a single consolidated
checklist so you can pick up work in one place instead of jumping
between three documents.

Every tier still ends the same way: `npm run validate` (typecheck +
tests) must pass, then commit, before moving to the next tier.

---

## Tier 13 — Local-First, No Server At All

**Goal:** zero hosting cost, ever. All data lives on-device. The app is
a static bundle with no backend dependency.

**Tasks:**
1. Confirm what `lib/local-data.ts` already uses for on-device storage
   (AsyncStorage vs expo-sqlite) — build on top of it, don't replace it.
2. Delete `server/`, `drizzle/`, and the tRPC plumbing (`lib/trpc.ts`,
   `server/routers.ts`, `server/db.ts`).
3. Delete `lib/infrastructure/sync/mutation-queue.ts` and
   `sync-state.ts` — no longer needed once there's nothing to sync to.
4. Remove any "Backup & Sync" toggle or setting that implies server
   connectivity, if one already exists in `settings.tsx`.
5. Replace server-dependent push notification scheduling with
   `expo-notifications` local scheduling — reminders are set and fired
   entirely on-device.
6. Remove server-related env vars, API URLs, and deployment config tied
   to a backend (keep only static-hosting config).

**Definition of done:** `grep -r "trpc\|drizzle\|server/"` in the app
code returns nothing outside deleted paths; the app runs fully offline
after first load; `npm run build:web` still produces a working
`web-build/`; `npm run validate` passes.

---

## Tier 14 — "Smart" Eagle Without Paid AI

**Goal:** Eagle's insights ("Eagle has a read on this one") come from
free, on-device rule-based logic — not an LLM API call — so the app
never costs anything to run.

**Tasks:**
1. **Local history tracking:** for each commitment, persist
   completion/slip outcomes alongside existing fields (priority, time,
   category) in the same local-data store from Tier 13.
2. **Frequency-pattern logic:** compute simple stats over that history
   — e.g. "missed X of last Y attempts in this category/time-slot" —
   to generate lines like the existing "tends to slip after 6 PM" copy.
   This is where the "Fourier-ish" instinct actually applies: not a
   real transform, but the same idea of finding a recurring pattern by
   time-of-day / day-of-week bucket, using plain counting and ratios.
3. **Insight surfacing rule:** define one clear rule for *when* Eagle
   shows a line (e.g. only surface a pattern once it has enough data —
   3+ occurrences — so early users don't see false-confidence insights
   from one data point).
4. **No network calls:** confirm nothing in the Eagle insight path
   makes an HTTP request — this tier only counts as done if the
   feature works with the device fully offline.

**Definition of done:** turn off Wi-Fi, use the app for a few days of
mock data, and Eagle still produces a relevant "read" line with zero
network activity.

---

## How the "intuitive design" principles map onto existing tiers

You listed: simplicity, learnability, usability, reliability,
recognition over recall, visibility, feedback, consistency, affordance,
constraints, uniformity. Rather than adding a new tier for these, here's
where each one already lives in the plan — so nothing gets duplicated
or missed:

| Principle | Covered in |
|---|---|
| Visibility, feedback | Tier 9 |
| Consistency, recognition over recall, uniformity | Tier 10 |
| Affordance, constraints | Tier 11 |
| Reliability, learnability, error prevention | Tier 12 |
| Simplicity (one-button home, fewer screens) | Already agreed — folded into the Today-screen cleanup described under Tier 11 (form/appearance audit) and worth calling out explicitly as Tier 11, task 5 below |

One addition worth making explicit in Tier 11 since it came up directly
in your last message: add a task 5 — **"reduce Today-screen surface
area"** — move the meeting-links row, the optional-URL field, and the
"3/6 On your radar" counter into a secondary/expandable area, so only
the current top commitment and the quick-capture input are visible
without scrolling. This is the concrete version of "all core
functionality in a few clicks."

*(Note on "Liskov" — that principle is about substitutability in object-
oriented code, not a UI heuristic, so there's no direct UX equivalent to
add a tier for. If what you meant is "a pattern should behave the same
everywhere it's reused" — that's already Tier 10's consistency work.)*

---

## Consolidated pickup list — priority order

1. **Tier 8 — Drop Electron.** Do this first; it removes an entire
   build path and simplifies every tier after it.
2. **Tier 9, task 1 — Icon audit.** The two new broken icons from your
   latest screenshots (blank white square top-right of "Weekly Signal",
   blank orange square near "0%") are quick, visible, and likely the
   same root cause as the icons already fixed — good second item.
3. **Tier 9, tasks 2–4 — Interactive/loading/async feedback states.**
4. **Tier 10 — Consistency & recognition** (radii tokens, button
   hierarchy, terminology, icon-label rule).
5. **Tier 11 — Affordance & constraints**, including the new task 5
   (Today-screen decluttering).
6. **Tier 12 — Reliability, error states, onboarding.**
7. **Tier 13 — Local-first, no server.** Independent of 8–12; can run
   in parallel if you want to split sessions, but sequencing it after
   the UI work means you're not touching data-layer and UI at once.
8. **Tier 14 — Rule-based Eagle insights.** Depends on Tier 13's local
   history store existing first.

**Still open, unresolved from your screenshots:**
- Sidebar not appearing above ~900px width — width-read fix didn't
  work. Lower priority now that the app is web/phone-first, but still
  worth a ticket.

---

## Suggested next step

Pick one line item from the top of the pickup list and we execute it —
I'd suggest starting with Tier 8 (Electron removal) since it's already
scoped and independent of everything else, then the icon audit as a
fast, visible win. Say which one and I'll start making the changes.
