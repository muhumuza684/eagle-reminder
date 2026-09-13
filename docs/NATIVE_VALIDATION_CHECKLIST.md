# D-EAGLE HUB — Native-Device Validation Checklist (updated)

## Purpose

Several core features depend on OS-level permissions, notification delivery, external app availability, and share sheets that **cannot be proven by TypeScript, lint, or a unit test alone**. This checklist is the test harness for that gap: a fixed matrix to run on a physical iOS device and a physical Android device.

Static checks (typecheck/lint/unit tests — see FIXES-LOG.md for what's been run and how) validate *logic*. This checklist validates *behavior on the OS* — the two are complementary, not redundant. Run this after static checks pass, not instead of them.

**This version updates the original checklist** (base app + Tier 1's "Section 7" work) with everything added since: production push delivery, the onboarding flow, delete, the history view, and the auth entry gate. Sections marked **NEW** didn't exist in the prior checklist at all. §2's "known gap" note about server-side escalation has been updated to reflect what Tier 3 #12 actually closed and what it didn't.

## How to use this checklist

- One pass per platform (iOS **and** Android) — do not treat a passing iOS run as covering Android or vice versa.
- Each row has a **Setup**, an **Action**, and an **Expected result**. Record Pass / Fail / Blocked and a one-line note. A "Blocked" item should be logged, not silently skipped.
- **[Sandbox-OK]** can be verified in Expo Go / a simulator and does not require physical hardware.
- **[Device-only]** requires physical hardware and cannot be meaningfully faked in a simulator.
- Re-run **[Device-only]** rows after any change to `native-services.ts`, `pushDelivery.ts`/`pushSchedule.ts`/`pushJob.ts`, the notification content/trigger shapes, or the OAuth flow.

## 1. Authentication & first-launch entry (updated — Tier 3 #12)

| # | Setup | Action | Expected result | Type |
|---|---|---|---|---|
| 1.1 **NEW** | Fresh install, no prior guest choice | Launch the app | The new Welcome screen (`components/auth-gate.tsx`) appears before the main tabs — not the tabs directly | Device-only |
| 1.2 **NEW** | On the Welcome screen | Tap "Continue without an account" | Proceeds to the main tabs in guest/local mode; relaunching the app does NOT show Welcome again | Sandbox-OK |
| 1.3 **NEW** | On the Welcome screen | Tap "Sign in to sync across devices" | Button shows a spinner immediately (not a dead tap while the OAuth sheet opens), then behaves as 1.4 below | Device-only |
| 1.4 | Fresh install, signed out | Tap "Securely sign in" (Welcome or Settings) | OAuth browser sheet opens, completes, returns to app signed in; Settings shows name/email | Device-only |
| 1.5 | Signed in | Kill and relaunch the app | Session persists — no forced re-login, and Welcome does not reappear | Device-only |
| 1.6 | Signed in | Tap "Sign out" | Returns to guest/local mode; commitments created afterward stay device-local until signed in again | Sandbox-OK |
| 1.7 | Signed out (guest mode) | Use the app for a full day (capture, briefing, review) | All flows work locally; no crash or blocking prompt from any `protectedProcedure` call | Sandbox-OK |

## 2. Push / local notifications (updated — Tier 3 #12 closes part of the old "known gap")

| # | Setup | Action | Expected result | Type |
|---|---|---|---|---|
| 2.1 | First launch, signed in | Reach the point where `registerForNotifications()` runs | OS permission prompt appears; denying does not crash the app or block other features | Device-only |
| 2.2 **NEW** | Permission granted, signed in | Check server logs / DB after the app has been open a few seconds | A row exists in `pushTokens` for this device (confirms the Tier 3 #12 registration wiring actually reached the server, not just the client-side token fetch) | Device-only |
| 2.3 | Permission granted | Set Morning Briefing to 1–2 minutes from now in Settings | Local notification fires at that time with correct title/body, even with the app backgrounded | Device-only |
| 2.4 **NEW** | A `pushTokens` row exists (2.2), and `runScheduledPushJob()` is actually invoked by something (cron/manual) at the user's briefing hour | Trigger the job | A **server-sent** push arrives (distinct from 2.3's local one) with dynamic content reflecting the real open-commitment count | Device-only, and requires job infrastructure to exist — see FIXES-LOG.md Tier 3 #12 |
| 2.5 | Same as 2.4, run the job twice within the same local hour | — | Only one push is sent per kind per local day (confirms `markBriefingSent`/`markReviewSent` + `selectDuePushes`' same-day guard) | Device-only |
| 2.6 | A commitment with a meeting link, starting in 6 minutes | Wait | Five-minute warning notification fires; tapping it opens the meeting per §5 | Device-only |
| 2.7 | Flag a commitment critical with a same-day deadline in ~2 minutes (compress the deadline for testing) | Wait through both offsets | Both checkpoint notifications fire, each with distinct, correctly-worded copy for `day_before` vs `three_hours` | Device-only |
| 2.8 | Critical commitment created, then un-flagged before its checkpoints fire | Un-flag from the commitment sheet | Both pending checkpoint notifications are cancelled — confirm via `Notifications.getAllScheduledNotificationsAsync()` in a debug log | Device-only |
| 2.9 | App killed (not backgrounded) at a checkpoint's due time | — | Local notification still fires (OS-scheduled, independent of the JS process) | Device-only |
| 2.10 | — | — | **Updated known gap:** checkpoint *escalation* (marking a checkpoint "escalated" and voice-alerting) still only happens client-side, while the app is foregrounded around the due time — Tier 3 #12's server push job intentionally scoped to the daily ritual (briefing/review) only, not checkpoint escalation, to avoid double-notifying users on top of the existing local-notification coverage (see FIXES-LOG.md's reasoning). This is a deliberate scope decision, not an oversight — re-evaluate if user reports suggest checkpoints are still being missed with the app closed. | N/A — document, don't test |

## 3. Text-to-speech (Eagle voice)

| # | Setup | Action | Expected result | Type |
|---|---|---|---|---|
| 3.1 | Voice alerts enabled in Settings | Trigger an at-risk rescue banner tap | Device speaks the Eagle line aloud through the correct audio output | Device-only |
| 3.2 | Phone on silent / Do Not Disturb | Repeat 3.1 | Confirm and document actual OS behavior — do not assume; varies by OS version | Device-only |
| 3.3 | Voice alerts disabled in Settings | Trigger a moment that would otherwise speak | No audio plays | Sandbox-OK |
| 3.4 | A meeting starts now | Observe | Eagle speaks once, not repeatedly on every 30-second poll | Device-only |

## 4. Voice capture (speech-to-text)

| # | Setup | Action | Expected result | Type |
|---|---|---|---|---|
| 4.1 | First use of the mic button | Tap it | OS microphone/speech-recognition permission prompt appears; denial leaves the button inert, not crashed | Device-only |
| 4.2 | Permission granted | Say "Call Dad tomorrow at 7pm" | Transcript populates the capture field | Device-only |
| 4.3 | Same as 4.2, sentence containing a Zoom/Meet URL | Speak the URL | Meeting link extracted, "link detected" toast with working Edit/Undo | Device-only |
| 4.4 | Say "Eagle, don't let me forget to renew my passport before 5pm tomorrow" | Speak it, submit | Commitment created directly as critical with both checkpoints scheduled — no clarifying prompt | Device-only |
| 4.5 | Say "Eagle, don't let me forget to renew my passport" (no deadline) | Speak it, submit | Clarifying-question modal appears asking for a specific time | Device-only |

## 5. Deep links / meeting launch

| # | Setup | Action | Expected result | Type |
|---|---|---|---|---|
| 5.1 | Zoom app installed, valid Zoom URL | Tap "Open Zoom" | Native Zoom app opens directly to the meeting | Device-only |
| 5.2 | Zoom app **not** installed | Repeat 5.1 | Falls back to the browser, no crash or dead tap | Device-only |
| 5.3 | Repeat 5.1/5.2 for Google Meet | — | Same pass criteria | Device-only |
| 5.4 | Meeting notification delivered while app is backgrounded | Tap the notification | App opens and routes to the meeting, not just Today with no action | Device-only |

## 6. Sharing / image export

| # | Setup | Action | Expected result | Type |
|---|---|---|---|---|
| 6.1 | Signal dashboard with a few days of data | Tap share, preview, confirm | Native share sheet opens with a rendered PNG | Device-only |
| 6.2 | Same as 6.1 | Cancel from the native share sheet | App returns to the preview cleanly — no stuck spinner, no false "shared" toast | Device-only |
| 6.3 | Deny photo library / media permission if prompted | Repeat 6.1 | Clear failure state, not a silent no-op | Device-only |
| 6.4 | — | Generate the AI quote with network disabled | Falls back to the static default quote | Sandbox-OK |

## 7. Offline behavior

| # | Setup | Action | Expected result | Type |
|---|---|---|---|---|
| 7.1 | Airplane mode | Capture a commitment | Saves locally immediately; no crash, no infinite spinner (Tier 1 #4) | Device-only |
| 7.2 **NEW** | Airplane mode, signed in | Capture a commitment, then re-enable network | The `syncFailed` cloud-offline icon (Tier 1 #1) appears while offline, then clears once the retry tick succeeds after reconnecting | Device-only |
| 7.3 | Airplane mode | View Today and Review | Both render from local cache, no blank/error screens | Device-only |
| 7.4 **NEW** | Two devices, same account, one offline | Create a commitment on the offline device, then bring it online while the other device is active | The offline device's item eventually appears on the other device (via the Tier 3 #10 merge, not a wholesale overwrite that could've dropped it) | Device-only, requires two devices |

## 8. Onboarding, delete, and history (NEW — Tier 3 #9, #10/#11)

| # | Setup | Action | Expected result | Type |
|---|---|---|---|---|
| 8.1 | Fresh install (past the Welcome/auth-gate screen) | Land on Today for the first time | The 4-slide onboarding modal appears; "Next"/"Skip"/"Got it" all correctly dismiss it and don't reappear on next launch | Sandbox-OK |
| 8.2 | Onboarding already dismissed | Settings → HELP → "Show the intro again" | Confirmation alert appears; onboarding modal reappears next time Today is opened | Sandbox-OK |
| 8.3 | A commitment exists | Open its detail sheet, tap "Delete this commitment" once, then again | First tap arms it ("Tap again to permanently delete"); second tap actually deletes; a single tap elsewhere doesn't accidentally trigger delete | Sandbox-OK |
| 8.4 | Several commitments captured across different days (adjust device clock between captures, or wait) | Open Review → Past days | Each prior day is listed with correct completed/missed counts; tapping expands to that day's items; today's items are NOT duplicated into this list | Sandbox-OK |
| 8.5 | 6 active commitments today, a 7th added | Confirm swap suggestion | Only today's 6 count toward the limit — an old unresolved item from a previous day (if any survived from before Tier 3 #11) does not incorrectly count | Sandbox-OK |

## Sign-off

Not complete until:
- Every Device-only row has a Pass/Fail/Blocked result on **both** a physical iOS and a physical Android device, dated and attributed.
- Every "known gap" note (currently: §2.10) is either resolved or explicitly carried forward, not silently dropped.
- §2.4/§2.5 (server push) additionally require confirming `runScheduledPushJob()` is actually being invoked on a schedule somewhere — those rows can't pass in an environment where nothing calls it yet.

| Platform | Device / OS version | Run date | Result | Notes |
|---|---|---|---|---|
| iOS | | | | |
| Android | | | | |
