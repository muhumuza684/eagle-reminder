## Noir luxury redesign

- New watch-face home screen with a rotating minute track, seconds hand, globe, tourbillon and flip date.
- Three motions that arrive exactly on time: Orbit, Mainspring and Express (Settings > Motion, with Preview).
- Reminders ring until answered: repeating, louder chime with vibration; Done or Snooze 10 min.
- Four synthesized ringtones and a train horn.
- Five finishes (Settings > Finish) and the eagle emblem as the app icon, favicon and manifest icons.
- Unlimited reminders, a reminders list with Follow, delete and Undo, and a month sheet.
- Replaced the icon font with react-native-svg; fonts are bundled (Cormorant Garamond, Manrope).
- Web build moves assets out of `node_modules` so hosts cannot drop fonts and images.
- Removed About and Support, and the old layout, tokens and picker components.
- The PWA is the only target: removed the Android and iOS configuration, EAS build settings, and every native-only module and adapter.

- Added cryptographically random UUIDv4 client identity.
- Added domain commitment contract and revision semantics.
- Added application create/revise service.
- Added timezone-aware clock/date-key abstraction.
- Added identity/domain/clock tests.
- Added typecheck/test/validate scripts.
- Added migration for clientId/revision.