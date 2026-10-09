# D-Eagle Hub - PWA delivery

## What it is

D-Eagle Hub is a luxury reminders watch. You say or type a reminder, pick a day and time, and a gold moving part travels the ring and arrives exactly when the reminder is due. It is built with React, Expo Router and React Native Web. The PWA is the only runtime. Reminders and settings stay on the device (encrypted in browser storage). There is no account, server or database.

## The design

- **Three zones on a wide screen:** the watch on the left, the guided steps in the middle, and Quick style on the right. On a tablet the palette moves under the steps; on a phone it opens from a **Quick style** button.
- **Guided steps** (`components/compose.tsx`): 1 What, 2 When (one-tap chips - In 10 min, In 1 hour, This evening, Tomorrow 9 AM - or Pick a time with normal date and time fields), 3 Check and set (the result in words, the ringtone and motion it will use, and Set). Typing or saying a time ("gym Friday at 6pm") fills the day and time for you. A hollow gem on the watch shows where the reminder will land before you set it.
- **Quick style** (`components/palette.tsx`): ringtone (tap to hear it), finish and motion, all in one place.
- **Three pages** in the bottom bar: Today, Reminders (every reminder, with Follow, Done and delete with Undo; a count badge shows how many wait) and Settings (only Reminders on/off and Quiet hours).
- **Noir with five finishes:** Champagne Gold, Rose Gold, Emerald & Gold, Sapphire & Platinum, Ruby & Gold (`lib/theme.tsx`). Every metal fill is a plain colour or a CSS gradient, never an SVG gradient reference, so nothing can fail to draw.
- **The watch** (`components/watch/dial.tsx`): rotating minute track, flowing lane, sweeping seconds hand, turning globe, tourbillon and a flip date window.
- **Three motions** (Preview the motion): Orbit, Mainspring and Express. The position maths is in `lib/watch.ts` and is unit-tested: at the due time the moving part is exactly on the goal.
- **Ringing** (`lib/app-state.tsx`, `components/overlays.tsx`): when a reminder comes due, on any page, a card appears and the ringtone repeats, louder each time, with a buzz, until you tap Done or Snooze 10 min.
- **Ringtones:** Crystal chime, Marimba, Glass bell, Music box, plus a train horn for Express (`assets/sounds/`).
- **Icons are drawn with react-native-svg**, so there is no icon font to fail on a host. The eagle emblem is `components/watch/emblem.tsx`.

## What makes it a PWA

- `public/manifest.json` - name, standalone display, noir theme colours, a normal and a maskable icon
- `public/sw.js` - caches the app shell, serves the offline page, opens the app when a notification is tapped
- `public/offline.html` - shown when there is no network and the page is not cached
- `app/+html.tsx` - links the manifest and registers the service worker (not on localhost, so development never runs on a stale copy)
- `scripts/verify-pwa.mjs` - checks all of the above on every build

## Reminder behavior

Reminders use browser notifications, shown through the service worker so Android Chrome accepts them. Timers run while the PWA is open (a browser tab, or the installed app running). While it is open, the in-app card rings until you answer, with a louder chime each time, and the phone vibrates where the browser allows it. Reminders saved earlier are scheduled again when the app opens.

When the browser is closed or the phone suspends the PWA, web timers do not run. Delivering reminders then needs Web Push, which needs a server, and this app deliberately has none.

## Speed

The first visit downloads the app (about 370 KB compressed) and five Latin-only WOFF2 fonts (65 KB in total, `assets/fonts/`; `metro.config.js` lets the bundler handle them). The page never waits for fonts, and it draws at about 20 frames a second and pauses while the tab is hidden. `netlify.toml` tells browsers to keep the hashed files for a year, so a return visit loads from the device.

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

Then follow `docs/DEVICE_CHECKLIST.md` on a real device.
