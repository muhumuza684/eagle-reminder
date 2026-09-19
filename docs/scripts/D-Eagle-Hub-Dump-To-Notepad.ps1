<#
D-Eagle Hub — Full Tier Plan Dump
Writes the complete Tier 8-18 plan to a text file next to this script
(or to your Desktop if run from somewhere read-only), then opens it in
Notepad so you have the whole thing in one place while you work.

Usage:
  Right-click -> Run with PowerShell
  or from a PowerShell prompt:  .\D-Eagle-Hub-Dump-To-Notepad.ps1
#>

# Pick an output folder: next to the script if writable, else Desktop
$scriptDir = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
$outDir = $scriptDir
try {
    $testFile = Join-Path $outDir "._write_test.tmp"
    New-Item -Path $testFile -ItemType File -Force -ErrorAction Stop | Out-Null
    Remove-Item $testFile -Force
} catch {
    $outDir = [Environment]::GetFolderPath("Desktop")
}

$timestamp  = Get-Date -Format "yyyy-MM-dd_HHmm"
$outFile    = Join-Path $outDir "D-Eagle-Hub-Full-Tier-Plan_$timestamp.txt"

$content = @"
================================================================
D-EAGLE HUB — FULL TIER PLAN (Tiers 8-18)
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm")
================================================================

Ground rule for every tier: npm run validate (typecheck + tests)
must pass, then commit, before moving to the next tier.

Free/paid tags apply within Tiers 15-18 only. Tiers 8-14 are core
UX and are never gated. No paywall is wired yet anywhere — every
feature ships and works for free right now. Tags just mark the
intended line for when gating gets built later.

----------------------------------------------------------------
TIER 8 — Drop Electron
----------------------------------------------------------------
Goal: pure Expo web export, deployable as a static site, zero
desktop-packaging weight.

Tasks:
1. Delete desktop/ (main.cjs, preload.cjs) and desktop-release/.
2. Remove electron, electron-builder, electron-builder-squirrel-
   windows, electron-publish, electron-to-chromium, electron-
   winstaller from package.json devDependencies; npm install to
   prune node_modules.
3. Remove desktop, desktop:pack, desktop:verify scripts. Rename
   desktop:build-web to build:web (it's the one and only build now).
4. Remove the build config block from package.json (electron-
   builder config, no longer used).
5. Add .nvmrc or note Node version in README so CI/Netlify match
   local dev.

Done when: npm run build:web produces web-build/, npx serve
web-build runs correctly, git status shows no leftover Electron
artifacts, npm run validate passes.

----------------------------------------------------------------
TIER 9 — Visibility & Feedback
----------------------------------------------------------------
Goal: the user always knows what's happening, what's clickable,
and what just happened as a result of their action.

Tasks:
1. Icon audit (blocking) — grep the whole codebase for remaining
   @expo/vector-icons imports outside icon-symbol.tsx. Known
   offenders: the dashboard share icon (blank white square, top-
   right of "Weekly Signal") and the orange stat icon near "0%".
   Route all through IconSymbol.
2. Interactive states — every tappable element (buttons, list
   rows, chips, tabs) needs a visible pressed/hover state. Known
   gaps: meeting-link pills, input-row icon buttons.
3. Loading states — "0%" dashboard values must visually distinguish
   "no data yet" from "still loading."
4. Async feedback — any save/send/submit action needs a brief
   visible confirmation (toast, checkmark, color flash), not a
   silent state change.

Done when: click through every screen; nothing changes state
silently, nothing looks identical whether loading or empty.

----------------------------------------------------------------
TIER 10 — Consistency & Recognition Over Recall
----------------------------------------------------------------
Goal: a pattern learned on one screen works identically everywhere;
nothing forces the user to remember instead of see.

Tasks:
1. Finish radii token rollout — review.tsx and settings.tsx still
   use ungoverned corner-radius values; bring onto constants/radii.ts
   like dashboard.tsx/index.tsx already are.
2. Button hierarchy token — define primary/secondary button styles
   once (constants/, alongside radii/spacing/typography). Fix: Zoom
   (solid blue) vs Google Meet (washed-out gray) currently read as
   one enabled + one disabled when both should be equal secondary
   actions.
3. Consistent terminology — confirm "commitments" (Today), "on your
   radar", and review.tsx/settings.tsx terms for the same concepts
   match throughout.
4. Icon-label pairing rule — decide once: icons always ship with a
   text label, or never (icon-only + aria-label). Apply everywhere.

Done when: a design-token grep (radii\., spacing\., typography\.)
shows every screen sourcing from constants/, no inline magic
numbers left in (tabs)/*.tsx.

----------------------------------------------------------------
TIER 11 — Affordance & Constraints
----------------------------------------------------------------
Goal: things that can be done look obviously doable; things that
can't are prevented or explained, not silently failing.

Tasks:
1. Audit every button/pill — appearance must match actual
   interactive state. No button should look disabled unless it is,
   none should look enabled unless it is (whole-app pass, ties to
   the Zoom/Google Meet fix in Tier 10).
2. Form constraints — "What do you need to hold?" input and
   "Optional meeting URL" field get real-time validation (e.g.
   malformed URL shows an inline hint immediately, not after submit).
3. Destructive-action constraints — deleting a commitment/review
   item requires a confirm step or lightweight undo-toast.
4. Empty vs filled input affordance — placeholder text must be
   visually distinct from real entered text (check contrast/weight
   on --placeholderTextColor across all inputs).
5. Reduce Today-screen surface area — move meeting-links row,
   optional-URL field, and "3/6 On your radar" counter into
   secondary/expandable areas so only the top commitment and
   quick-capture input are visible without scrolling.

Done when: every interactive element's look matches its actual
behavior; nothing invites a tap that does nothing or fails silently.

----------------------------------------------------------------
TIER 12 — Reliability, Error Prevention & Learnability
----------------------------------------------------------------
Goal: a brand-new user understands the app with no instruction;
it degrades gracefully instead of breaking.

Tasks:
1. First-run empty states — confirm every screen has one (not just
   "0%" and blank space). Review already has one ("Nothing captured
   for today yet"); audit Dashboard/Settings for the same treatment.
2. Error states — consistent inline error pattern for failed saves
   or no network, matching the existing amber "Eagle has a read on
   this one" card style so errors feel native, not bolted on.
3. Undo, not just confirm — prefer "do it, then offer undo" over
   blocking confirm dialogs where possible.
4. Lightweight onboarding — a first-launch, one-sentence explanation
   of who/what "Eagle" is.

Done when: someone who's never seen the app can hold a commitment
and understand the Review flow without being told how.

----------------------------------------------------------------
TIER 13 — Local-First, No Server At All
----------------------------------------------------------------
Goal: zero hosting cost, ever. All data lives on-device.

Tasks:
1. Confirm what lib/local-data.ts already uses for on-device
   storage (AsyncStorage vs expo-sqlite); build on it, don't
   replace it.
2. Delete server/, drizzle/, and tRPC plumbing (lib/trpc.ts,
   server/routers.ts, server/db.ts).
3. Delete lib/infrastructure/sync/mutation-queue.ts and
   sync-state.ts — nothing left to sync to.
4. Remove any "Backup & Sync" setting implying server connectivity.
5. Replace server-dependent push scheduling with expo-notifications
   local scheduling.
6. Remove server-related env vars, API URLs, backend deploy config.

Done when: grep -r "trpc|drizzle|server/" returns nothing outside
deleted paths; app runs fully offline after first load; npm run
build:web still works; npm run validate passes.

----------------------------------------------------------------
TIER 14 — "Smart" Eagle Without Paid AI
----------------------------------------------------------------
Goal: Eagle's insights come from free, on-device rule-based logic —
no LLM API call, no cost to run.

Tasks:
1. Local history tracking — persist completion/slip outcomes per
   commitment alongside priority/time/category, in the Tier 13
   local-data store.
2. Frequency-pattern logic — compute stats over that history (e.g.
   "missed X of last Y attempts in this category/time-slot") to
   generate lines like "tends to slip after 6 PM." This is the
   "Fourier-ish" idea in practice: recurring pattern by time-of-day/
   day-of-week bucket, via plain counting and ratios — not a real
   transform.
3. Insight surfacing rule — only surface a pattern once there's
   enough data (e.g. 3+ occurrences) to avoid false-confidence
   insights early on.
4. No network calls — confirm nothing in the Eagle insight path
   makes an HTTP request.

Done when: with Wi-Fi off and a few days of mock data, Eagle still
produces a relevant "read" line with zero network activity.

----------------------------------------------------------------
TIER 15 — Capture & Notification Intelligence
----------------------------------------------------------------
Goal: the capture box and reminders get smarter, local logic only.

Tasks:
1. [FREE] Natural-language date/time parsing in quick-capture —
   "call mum tomorrow 7pm" resolves without a separate time-picker
   step. Lightweight local parser library, no AI.
2. [FREE] Notification actions — snooze ("in 1 hour"/"tomorrow") or
   mark done directly from the fired notification.
3. [FREE] Recurring commitments — a repeat pattern (daily/weekly/
   "every Sunday") instead of manual re-entry; feeds the Tier 14
   history store.
4. [PAID] Gentle escalation — soft nudge, then a firmer follow-up
   if still unmarked closer to the deadline.
5. [FREE] Quiet hours — a do-not-disturb window so reminders don't
   fire overnight.

Done when: a typed natural sentence lands with the right date/time;
a fired notification is actionable without opening the app; a
recurring commitment regenerates correctly; escalation and quiet
hours behave as configured.

----------------------------------------------------------------
TIER 16 — Presence & Data Portability
----------------------------------------------------------------
Goal: visible without being opened; data never trapped on one
device, no server involved.

Tasks:
1. [PAID] Home-screen widget showing the next commitment.
2. [FREE] Manual export/import — export all local data to a JSON
   file, import it on a new device. Stays free: it's a trust
   feature (protects against losing everything if the phone is
   lost), not a convenience one.

Done when: widget reflects the current top commitment and updates
when it changes; export produces a file that re-imports cleanly and
restores commitments and history intact.

----------------------------------------------------------------
TIER 17 — High-Priority Alerts (Lock Screen & Sound)
----------------------------------------------------------------
Goal: the most important reminders are hard to miss, within what
each platform actually allows.

Tasks:
1. [PAID] Full-screen/lock-screen notifications on Android — the
   "full-screen intent" mechanism alarm/call apps use; wakes the
   screen and displays over the lock screen even when silenced.
   Requires a config plugin or custom native module outside Expo's
   managed workflow — scope this as a spike before committing a date.
2. [PAID] Custom high-priority notification sound for commitments
   marked urgent, distinct from the default tone.
3. [FREE - documented, not built] iOS ceiling — iOS does not allow
   third-party apps to bypass silent mode or force full-screen
   outside CallKit's VoIP-call category. No version of task 1 works
   on iOS. Document this in Settings rather than silently failing.
4. [Not building] Powering on a fully powered-off device — confirmed
   not possible on any platform for any app. Recorded so it isn't
   re-raised as a bug later.

Done when: on Android, an urgent task triggers a full-screen,
sound-overriding alert even when silenced/locked; on iOS, the
loudest notification the platform allows fires, with the limitation
explained to the user.

----------------------------------------------------------------
TIER 18 — Next-of-Kin Escalation (Missed Commitment Alert)
----------------------------------------------------------------
Goal: if someone doesn't respond to a critical commitment, a chosen
contact gets notified — the one deliberate exception to "no server."

Tasks:
1. [PAID] Contact list for escalation — one or more next-of-kin
   contacts by name + email (email chosen because it's the only
   channel with a genuinely free/cheap automated-sending tier;
   WhatsApp's sending API is a paid Business API with no free
   automated path).
2. [PAID] Missed-response window — user sets how long "no response"
   means before escalation fires (e.g. 2 hours past the reminder).
3. [PAID] Minimal server trigger — a small scheduled check (cron job
   or scheduled function, not a full backend) that finds commitments
   past their window and sends the alert email. A deliberate,
   contained exception to Tier 13's no-server rule, isolated to this
   one feature.
4. [FREE - documented] Reliability disclosure in Settings: this
   feature only works if the phone stays on and has signal at the
   time of the missed check — it cannot detect or alert on a dead or
   fully offline phone.
5. [PAID] Configurable number of recipients per escalation.

Done when: a missed commitment past its window triggers an email to
the configured contact(s); the server component runs on the
cheapest viable schedule and does nothing else; the reliability
disclosure is visible in Settings before the feature is enabled.

----------------------------------------------------------------
EXECUTION ORDER
----------------------------------------------------------------
8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16 -> 17 -> 18

Rationale: 8 first (simplifies every build after it). 9's icon
fixes are fast and visible. 10-12 finish core usability. 13 is the
data-layer foundation 14 depends on. 15-16 are free-tier polish on
a stable local-first base. 17-18 are the heaviest lifts (native
platform work, the one server exception) and depend on everything
below them being solid.

STILL OPEN / NOT YET A TIER:
- Sidebar not appearing above ~900px width. Low priority now that
  the app is web/phone-first, but not forgotten.

================================================================
END OF DUMP
================================================================
"@

Set-Content -Path $outFile -Value $content -Encoding UTF8

Write-Host "Full tier plan written to: $outFile"
Start-Process notepad.exe $outFile
