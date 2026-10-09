## Noir luxury redesign

- Guided steps: What, When (one-tap chips or a date and time picker), Check and set. Words you type or say fill in the day and time.
- Three zones: watch on the left, steps in the middle, Quick style (ringtone, finish, motion) on the right; a Quick style button on phones.
- A Reminders page in the bottom bar with a count badge, and a Settings page cut down to Reminders and Quiet hours.
- A hollow gem on the watch shows where the reminder will land before you set it.
- Every gold fill is now a plain colour or a CSS gradient. SVG gradient references were not drawing in some browsers, which hid the Set button, the ring and the time.
- The ringing card works on every page, not only Today.

- Fixed the pale layer the router painted over the design; screens and the navigation theme are now see-through.
- Faster first load: fonts are 65 KB (was 1.3 MB), the page no longer waits for them, and Netlify caches hashed files for a year.
- Voice typing explains itself: it shows when it is listening, what it heard, and why it failed (blocked microphone, no speech, offline, unsupported browser).
- Wider date cards on the watch so FRI, OCT and the like fit.

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