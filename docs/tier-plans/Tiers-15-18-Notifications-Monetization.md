# D-Eagle Hub — Tiers 15–18: Notification Intelligence & Freemium Split

Continuation of Tiers 8–14 (already delivered). These four tiers cover
everything agreed on in the brainstorm — capture intelligence,
presence/portability, high-priority alerts, and next-of-kin escalation
— tagged **[FREE]** or **[PAID]** so the freemium boundary is visible
in the plan from day one.

**Important:** tagging is for planning only. Nothing in these tiers
wires an actual paywall, billing, or feature gate — every feature ships
and works for everyone for now. The tag just marks which side of the
line each feature will sit on *when* gating gets built later, so we're
not retrofitting the split after the fact.

Same rule as before: `npm run validate` passes, then commit, before
moving to the next tier.

---

## Tier 15 — Capture & Notification Intelligence

**Goal:** the quick-capture box and the reminder itself get smarter,
using only local logic — no server, no API cost either way.

**Tasks:**
1. **[FREE] Natural-language date/time parsing** in quick-capture —
   "call mum tomorrow 7pm" resolves to a real date/time without a
   separate time-picker step. Lightweight local parser library, no AI.
2. **[FREE] Notification actions (snooze/done)** — reminder fires with
   inline "in 1 hour" / "tomorrow" / "done" actions, actionable straight
   from the notification without opening the app.
3. **[FREE] Recurring commitments** — a repeat pattern (daily/weekly/
   "every Sunday") instead of manual re-entry each time; recurrence
   metadata feeds the same local history store Tier 14 already reads.
4. **[PAID] Gentle escalation** — soft nudge, then a firmer follow-up
   notification if still unmarked closer to the deadline. Tagged paid
   because it's a clear "this app tries harder for me" feature, not a
   baseline expectation — free tier keeps the single flat reminder.
5. **[FREE] Quiet hours** — a do-not-disturb window so reminders don't
   fire overnight; baseline respect-the-user behavior, not a premium.

**Definition of done:** capture a commitment by typing a natural
sentence and it lands with the right date/time; a fired notification
can be snoozed or marked done without opening the app; a recurring
commitment regenerates correctly; escalation and quiet-hours settings
behave as configured.

---

## Tier 16 — Presence & Data Portability

**Goal:** the app is visible without being opened, and a person's data
is never trapped on one device — without any server involved.

**Tasks:**
1. **[PAID] Home-screen widget** showing the next commitment — real
   habit-forming value, reasonable to gate as a premium convenience.
2. **[FREE] Manual export/import** — export all local data to a JSON
   file, import it on a new device. This is a trust feature, not a
   convenience one — it stays free so "no server, ever" doesn't also
   mean "lose everything if you lose your phone."

**Definition of done:** widget (where built) reflects the current top
commitment and updates when it changes; export produces a valid file
that re-imports cleanly and restores commitments and history intact.

---

## Tier 17 — High-Priority Alerts (Lock Screen & Sound)

**Goal:** the most important reminders are genuinely hard to miss —
within what each platform actually allows.

**Tasks:**
1. **[PAID] Full-screen / lock-screen notifications (Android).** Uses
   the same "full-screen intent" mechanism alarm and call apps use —
   wakes the screen and displays over the lock screen even when
   silenced. Requires stepping outside Expo's managed workflow into a
   config plugin or custom native module; scope that spike before
   committing a date to this task.
2. **[PAID] Custom high-priority notification sound** — a distinct,
   louder/longer sound reserved for commitments marked urgent, separate
   from the default notification tone (free tier keeps default OS
   sound).
3. **[FREE — documented, not built] iOS behavior note.** iOS does not
   allow third-party apps to bypass silent mode or force full-screen
   display outside CallKit's VoIP-call category — there is no version
   of task 1 or the "turn the phone on" idea that works on iOS. This
   gets documented in-app (a short note in Settings) rather than
   silently failing, so paid iOS users aren't promised something the
   OS won't allow.
4. **[not building] Powering on a fully powered-off device.** Confirmed
   not possible for any app on any platform — no task, just recording
   the decision here so it isn't re-raised as a bug later.

**Definition of done:** on Android, a task marked urgent triggers a
full-screen, sound-overriding alert even when the phone is silenced or
locked; on iOS, the same task fires the loudest notification the
platform allows, with the limitation explained to the user rather than
left unexplained.

---

## Tier 18 — Next-of-Kin Escalation (Missed Commitment Alert)

**Goal:** if a person doesn't respond to a critical commitment, someone
they've chosen gets notified — accepting that this is the one feature
in the whole app that requires a small always-on server component.

**Tasks:**
1. **[PAID] Contact list for escalation** — user sets one or more
   next-of-kin contacts (name + email, since email is the only channel
   with a genuinely free/cheap automated-sending tier — WhatsApp's
   sending API is a paid Business API with no free automated path).
2. **[PAID] Missed-response window** — user sets how long "no response"
   means before escalation fires (e.g. 2 hours past the reminder).
3. **[PAID] Minimal server trigger** — a small scheduled check (cheapest
   viable: a low-frequency cron job or scheduled function, not a full
   backend) that looks for commitments past their response window and
   sends the alert email. This is a deliberate, contained exception to
   Tier 13's "no server" rule — isolated to this one feature so the
   rest of the app stays server-free.
4. **[FREE — documented] Reliability disclosure.** In Settings, a
   plain-language note: this feature only works if the phone stays on
   and has a signal at the time of the missed check — it cannot detect
   or alert on a dead phone or a fully offline one. This ships free
   (it's a limitation, not a feature) so paid users know exactly what
   they're getting.
5. **[PAID] Configurable number of recipients** — how many next-of-kin
   contacts get notified per escalation, settable per user.

**Definition of done:** a missed commitment past its window triggers an
email to the configured contact(s); the server component runs on the
cheapest viable schedule and does nothing else; the reliability
disclosure is visible in Settings before anyone enables the feature.

---

## Updated tier list (11 total so far)

8. Drop Electron
9. Visibility & Feedback
10. Consistency & Recognition Over Recall
11. Affordance & Constraints (+ Today-screen decluttering)
12. Reliability, Error Prevention & Learnability
13. Local-First, No Server At All
14. "Smart" Eagle Without Paid AI
15. Capture & Notification Intelligence
16. Presence & Data Portability
17. High-Priority Alerts (Lock Screen & Sound)
18. Next-of-Kin Escalation

**Free vs. paid at a glance:** everything in Tiers 8–14 is free by
nature (it's core UX, not a feature to gate). Within 15–18, free covers
NLP capture, notification actions, recurrence, quiet hours, and manual
export — the things a reminder app should do at baseline. Paid covers
escalation reminders, the widget, lock-screen/sound overrides, and the
next-of-kin alert — the features that either cost real infrastructure
(Tier 18) or go meaningfully beyond baseline expectations.
