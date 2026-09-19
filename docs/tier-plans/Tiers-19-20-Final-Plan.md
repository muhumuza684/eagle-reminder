# D-Eagle Hub — Tiers 19–20: Single-Screen Redesign & Intelligence Upgrade

Final two tiers, folding in everything researched and agreed: HCI/usability
work from Tiers 9-12 stays as-is underneath; these two tiers change the
*shape* of the app (five screens, one of them a daily habit) and upgrade
the *intelligence* underneath it (Bayesian shrinkage, circular mean, and
the Commitment Profile screen).

Free/paid tags as agreed. No paywall wired yet — tags mark intent only.
Same rule as every tier before: `npm run validate` passes, then commit,
before moving to the next tier.

---

## Tier 19 — Single-Screen Redesign

**Goal:** one screen for daily use (Home), everything else reachable but
out of the way. WhatsApp/Thunder-VPN-level simplicity via progressive
disclosure, not feature removal.

### 19a — Settings cut + About screen (smallest, do first)
1. [FREE] Settings reduced to exactly four controls: Reminders on/off,
   Quiet hours, Morning briefing time, Nightly review time.
2. [FREE] Export/Import local backup kept, moved to the bottom of Settings.
3. [FREE] New About screen: one-line description of Eagle, Show the intro
   again, Contact, version number, **Built by AGU / Bryt Ma Tech UG**.
4. **Removed:** Timezone control (read the device, never ask).
5. **Removed:** Language control (single option = noise, remove until a
   second language exists).
6. **Removed:** Meeting countdown chime and Five-minute meeting warning as
   separate toggles — folded into the single Reminders toggle.
7. [PAID] Eagle voice alerts — stays, but moves out of default Settings
   into a paid-tier row (was free-and-on by default; becomes opt-in paid).

### 19b — Home rebuild
8. [FREE] Day strip (7 days, today highlighted, tap to view any day)
   replaces any month-grid concept — never build a full calendar screen.
9. [FREE] Countdown hero: live time-remaining to the next commitment,
   title, Eagle risk line (from existing `predictMissRisk`), Done/Snooze.
10. [FREE] Capture bar: persistent text input + mic, single accent-filled
    control on the screen (the one primary action).
11. [FREE] Meeting link field stays collapsed behind "Add a meeting link"
    (already built in Tier 11 part 2) — confirm it still works inside the
    new layout, don't rebuild it.

### 19c — Bottom sheet (absorbs Review)
12. [FREE] Collapsed state: visible grab handle, day count, peek of next
    two commitments — never a fully hidden gesture.
13. [FREE] Dragged to full height: the rest of today's commitments, then
    the nightly review content (existing Review logic, no new code, new
    container only).
14. **Removed:** Review as a separate tab/route.

### 19d — Tab bar removal + Signal as modal
15. **Removed:** the four-tab bottom bar entirely.
16. [FREE] Tap the streak/count in the sheet header → Signal opens as a
    modal, shows one honest line: "You kept N of 6 this week."
17. [PAID] Full Signal charts, category breakdown, date-range filters,
    share/export card — same modal, locked state with an Upgrade prompt
    for free users (not hidden entirely — shown-but-locked, per the
    mockup already agreed).
18. **Removed:** Signal as a separate tab.
19. Avatar (top-right of Home) opens Settings and About — replaces the
    Settings tab icon.

**Definition of done (whole tier):** four tabs are gone from the app;
a first-time user can capture, complete, and review a commitment without
leaving Home; Settings shows exactly four controls plus backup; About
exists with the build credit; `npm run validate` passes at every sub-step.

---

## Tier 20 — Intelligence Upgrade & Commitment Profile

**Goal:** make `predictMissRisk` actually trustworthy on thin data, and
give the user a way to see and correct what Eagle believes about them —
the Spotify-Taste-Profile-inspired differentiator.

### 20a — Math upgrade to `lib/intelligence/`
1. [FREE, underlying logic] Beta-Binomial shrinkage replacing the raw
   `historicalMissRate` ratio — fixes the 1-of-1-miss-equals-100% bug,
   converges to the true rate only as evidence accumulates.
2. [FREE, underlying logic] Circular mean + von Mises concentration (κ)
   for "tends to slip around X" time claims — correct averaging of
   clock-time data, and a confidence signal (high κ = say it, low κ =
   stay quiet rather than guess).
3. [FREE, underlying logic] Exponential decay weighting so recent
   behavior counts more than behavior from months ago.
4. All new functions pure and unit-tested, same pattern as existing
   `lib/intelligence/predict.test.ts` — no framework dependency.
5. Lomb-Scargle periodicity detection: **not built this tier** — stays on
   the roadmap until there's enough real usage history for it to be
   worth anything over simple day-of-week counting.

### 20b — Commitment Profile screen
6. [PAID] New screen, opened from the Home avatar: shows Eagle's current
   top 1-2 beliefs in plain language ("You slip on People commitments
   after 6 PM"), with the evidence count ("4 of your last 5").
7. [PAID] Two actions: "That's right" / "Not really" — a correction from
   the user outweighs a single inferred data point in the shrinkage math
   from 20a, the same way Spotify's Taste Profile lets an edit override
   an inferred preference.
8. [FREE] The countdown-hero risk banner on Home keeps working exactly
   as today for free users; only the dedicated Profile screen with
   correction is paid.

**Definition of done:** `predictMissRisk` output changes visibly on
low-data test fixtures (no more 100%-on-one-miss); Commitment Profile
opens from the avatar, shows a real belief from real local history, and
a "Not really" tap measurably shifts the next prediction; all tests
green; `npm run validate` passes.

---

## Full removal list (both tiers, in one place)

- Timezone setting
- Language setting
- Meeting countdown chime toggle (folded into Reminders)
- Five-minute meeting warning toggle (folded into Reminders)
- Bottom tab bar (Today / Review / Signal / Settings icons)
- Review as its own screen/route (becomes the sheet's full-height state)
- Signal as its own tab (becomes an avatar/header-triggered modal)
- Eagle voice alerts as a free default-on toggle (becomes paid, opt-in)

Nothing on this list is deleted logic — every item above is a UI/tab
demotion into a modal, a fold-in, or a paid gate. The underlying
functions (`critical-cascade.ts`, `commitment-parser.ts`, `intelligence/`,
push pipeline) are untouched by this list.
