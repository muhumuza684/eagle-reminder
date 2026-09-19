# D-Eagle Hub — Master Tier List (8–18)

Single consolidated list, replacing the two separate "pickup list" and
"updated tier list" summaries from the two prior docs — this is the one
reference going forward. Full task-level detail for each tier still
lives in the two source docs; this is the deduplicated overview.

Free/paid tags apply within Tiers 15–18 only (Tiers 8–14 are core UX,
not gated). No paywall is wired yet — every feature ships free for now.

---

**Tier 8 — Drop Electron**
Remove desktop packaging; pure Expo web export, static-site deployable.

**Tier 9 — Visibility & Feedback**
Icon audit (incl. the two newly-spotted broken icons), pressed/hover
states, loading-vs-empty distinction, async save/send confirmation.

**Tier 10 — Consistency & Recognition Over Recall**
Finish design-token rollout, unify button hierarchy, consistent
terminology, one icon-label pairing rule.

**Tier 11 — Affordance & Constraints**
Appearance matches actual interactive state, real-time form validation,
confirm/undo on destructive actions, placeholder contrast, and
Today-screen decluttering (meeting links / URL field / "3/6" counter
moved to secondary/expandable).

**Tier 12 — Reliability, Error Prevention & Learnability**
First-run empty states, consistent inline error pattern, "do it then
offer undo," one-sentence Eagle onboarding.

**Tier 13 — Local-First, No Server At All**
All data on-device, delete server/drizzle/tRPC plumbing and the sync
queue, local push notifications — zero hosting cost.

**Tier 14 — "Smart" Eagle Without Paid AI**
Local completion/slip history, frequency-pattern insight lines,
minimum-data-before-surfacing rule, zero network calls.

**Tier 15 — Capture & Notification Intelligence**
[FREE] NLP date/time parsing in quick-capture, snooze/done from the
notification itself, recurring commitments, quiet hours.
[PAID] Gentle escalation (soft nudge → firmer follow-up).

**Tier 16 — Presence & Data Portability**
[FREE] Manual export/import to a JSON file.
[PAID] Home-screen widget showing the next commitment.

**Tier 17 — High-Priority Alerts (Lock Screen & Sound)**
[PAID] Android full-screen/lock-screen override notification, custom
urgent-priority sound.
[FREE — documented] iOS ceiling disclosed in Settings (platform doesn't
allow bypassing silent mode outside CallKit).
[Not building] Powering on a fully powered-off device — confirmed not
possible on any platform, recorded so it isn't re-raised later.

**Tier 18 — Next-of-Kin Escalation**
[PAID] Configurable next-of-kin contact(s), missed-response window,
minimal scheduled server check + email alert (WhatsApp excluded — no
free automated sending path), configurable number of recipients.
[FREE — documented] Reliability disclosure: can't catch a dead or fully
offline phone.

---

## Suggested execution order (unchanged, now single source)

8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18

Rationale recap: 8 first (simplifies every build after it), 9's icon
fixes are fast/visible, 10–12 finish core usability, 13 is the
data-layer foundation 14 depends on, 15–16 are free-tier polish on top
of a stable local-first base, 17–18 are the heaviest lifts (native
platform work, the one server exception) and make sense last since they
depend on everything below them being solid.

**Still open / not yet a tier:** sidebar not appearing above ~900px
width — low priority now that the app is web/phone-first, but not
forgotten.
