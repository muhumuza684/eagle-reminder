# D-Eagle Hub — PWA Delivery

## Brand palette

- Coral: `#F8444F`
- Paper: `#F7F8F3`
- Sky: `#78BDC4`
- Navy: `#012C3D`

## Architecture

D-Eagle remains React + Expo Router + React Native Web. The PWA is the primary runtime. Native functionality is isolated behind platform-specific files so the web bundle does not need to initialize native notification, speech-recognition, secure-storage, or date-picker modules.

Key platform splits:

- `lib/native-services.web.ts` / `.native.ts`
- `lib/notification-listener.web.ts` / `.native.ts`
- `lib/secure-storage.web.ts` / `.native.ts`
- `hooks/use-voice-capture.web.ts` / `.native.ts`
- `components/date-time-field.web.tsx` / `.native.tsx`

## PWA shell

The static web shell includes:

- Web app manifest
- Standalone display mode
- Service worker caching
- Offline fallback page
- Branded browser theme color
- Local encrypted browser storage
- Local backup export/import

## Reminder behavior

Browser notifications are supported through the Web Notification API. While the PWA is open, daily briefing/review timers and scheduled meeting/checkpoint alerts are handled locally. Background delivery while the browser is completely closed requires a future Web Push/VAPID service; that capability is intentionally not fabricated here.

## Delivery validation

Run locally from the project root:

```powershell
npm ci
npm run verify:pwa
npm run typecheck
npm test
npm run build:web
```

The delivery environment used for this source package could not complete a fresh npm dependency download, so the static source checks were completed but the final Expo web export must be run in the user's project environment.
