# D-Eagle Hub - PWA delivery

## What it is

D-Eagle Hub is a luxury reminders watch. You say or type a reminder, pick a day and time, and a gold moving part travels the ring and arrives exactly when the reminder is due. It is built with React, Expo Router and React Native Web. The PWA is the primary runtime, and the same code builds the Android app with `eas build`. Reminders and settings stay on the device (encrypted in browser storage). There is no account, server or database.

## The design

- **Noir with five finishes** (Settings > Finish): Champagne Gold, Rose Gold, Emerald & Gold, Sapphire & Platinum, Ruby & Gold. Each is mostly black, one metal and one gem colour (`lib/theme.tsx`).
- **The watch** (`components/watch/dial.tsx`): rotating minute track, flowing lane, sweeping seconds hand, a turning globe, a tourbillon cage and a flip date window.
- **Three motions** (Settings > Motion, each with a Preview): Orbit (a gold bead with a trail of light), Mainspring (a power-reserve arc and a racing tourbillon) and Express (a gold locomotive that slows into a station arch). The position maths is in `lib/watch.ts` and is unit-tested: at the due time the moving part is exactly on the goal.
- **Ringing**: when the time arrives, a card appears and the ringtone repeats, getting louder, with vibration, until you tap Done or Snooze 10 min.
- **Ringtones** (Settings > Ringtone): Crystal chime, Marimba, Glass bell, Music box, plus a train horn for Express. The files are in `assets/sounds/`.
- **Icons are drawn with react-native-svg**, so there is no icon font to fail on a host. The eagle emblem is `components/watch/emblem.tsx`.

## What makes it a PWA

- `public/manifest.json` - name, standalone display, noir theme colours, a normal and a maskable icon
- `public/sw.js` - caches the app shell, serves the offline page, opens the app when a notification is tapped
- `public/offline.html` - shown when there is no network and the page is not cached
- `app/+html.tsx` - links the manifest and registers the service worker (not on localhost, so development never runs on a stale copy)
- `scripts/verify-pwa.mjs` - checks all of the above on every build

Native-only code stays out of the web bundle through platform files:

- `lib/native-services.ts` (web) and `lib/native-services.native.ts`
- `lib/secure-storage.web.ts` and `lib/secure-storage.native.ts`
- `hooks/use-voice-capture.web.ts` and `hooks/use-voice-capture.native.ts`
- `components/date-time-field.web.tsx` and `components/date-time-field.native.tsx`

## Reminder behavior

- **PWA**: browser notifications, shown through the service worker so Android Chrome accepts them. Timers run while the app is open (a browser tab, or the installed app running). While it is open, the in-app card rings until you answer. Reminders saved earlier are scheduled again when the app opens.
- **Android app**: each reminder schedules ten notifications, one a minute apart, with the chosen ringtone on its own notification channel. Done or Snooze cancels the rest, so it keeps nudging until answered, even when the app is closed.
- When the browser is closed or the phone suspends the PWA, web timers do not run. Delivering reminders then needs Web Push, which needs a server, and this app deliberately has none. Use the Android app for that.

## Hosting

`npm run build:web` writes the site to `web-build/` and then moves `assets/node_modules` to `assets/vendor` (`scripts/relocate-assets.mjs`), because some hosts silently skip any folder named `node_modules`. Netlify builds this from GitHub using `netlify.toml` (build `npm run build:web`, publish `web-build`, Node 20). Every push to the production branch redeploys. The site must be served from the root of an https address, because the manifest and service worker use root paths.

## Installing

- Android Chrome: open the address, then menu, Install app.
- iPhone Safari: Share, then Add to Home Screen.
- Desktop Chrome or Edge: the install icon in the address bar.

## Validation

```powershell
npm ci
npm run verify:pwa
npm run typecheck
npm test
npm run build:web
```

Then follow `docs/NATIVE_VALIDATION_CHECKLIST.md` on a real device.
