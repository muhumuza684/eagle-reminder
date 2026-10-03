# D-Eagle Hub - PWA delivery

## What it is

D-Eagle Hub is a local-only reminders app built with React, Expo Router and React Native Web. The PWA is the primary runtime. The same code also builds an Android app with `eas build`. Reminders and settings are stored on the device, encrypted in the browser's storage. There is no account, server or database.

## Brand palette

- Coral: `#F8444F`
- Paper: `#F7F8F3`
- Sky: `#78BDC4`
- Navy: `#012C3D`

## What makes it a PWA

- `public/manifest.json` - name, icon, standalone display, theme colours
- `public/sw.js` - caches the app shell, serves the offline page, and opens the app when a notification is tapped
- `public/offline.html` - shown when there is no network and the page is not cached
- `app/+html.tsx` - links the manifest and registers the service worker (not on localhost, so development never runs on a stale copy)
- `scripts/verify-pwa.mjs` - checks the files above on every build

Native-only code stays out of the web bundle through platform files:

- `lib/native-services.ts` (web) and `lib/native-services.native.ts`
- `lib/secure-storage.web.ts` and `lib/secure-storage.native.ts`
- `hooks/use-voice-capture.web.ts` and `hooks/use-voice-capture.native.ts`
- `components/date-time-field.web.tsx` and `components/date-time-field.native.tsx`

## Reminder behavior

Reminders use browser notifications. While the PWA is open (a browser tab, or the installed app running), timers fire them at the chosen time. Android Chrome shows them through the service worker. Reminders saved in an earlier session are scheduled again when the app opens.

When the browser is closed, or the phone has suspended the app, the timers do not run. Delivering reminders in that state needs Web Push, which needs a server, and this app deliberately has none. For reliable reminders on Android, install the Android app.

## Hosting

`npm run build:web` writes the whole site to `web-build/`. Upload that folder to a static host that serves it from the root of an https address (Netlify Drop, Vercel, Cloudflare Pages). That address is where people open and install the PWA. A subfolder address, such as the default GitHub Pages one, needs extra configuration because the manifest and service worker use root paths.

## Installing

- Android Chrome: open the address, then menu, Install app.
- iPhone Safari: Share, then Add to Home Screen.
- Desktop Chrome or Edge: the install icon in the address bar.

## Validation

Run from the project root:

```powershell
npm ci
npm run verify:pwa
npm run typecheck
npm test
npm run build:web
```

Then follow `docs/NATIVE_VALIDATION_CHECKLIST.md` on a real device.