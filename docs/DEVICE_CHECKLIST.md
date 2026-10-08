# D-Eagle Hub - device checklist

Run these after any change that touches reminders, storage, sound or the watch.

## Web (`npx expo start --web`, or the Netlify address)

- [ ] The page loads without an error screen, and again after a refresh. Icons are drawn (no empty boxes).
- [ ] Type "Call Mum in 2 minutes" and tap Set. The Reminders chip counts 1 and the message names it.
- [ ] Refresh before it fires: the reminder is still listed and still fires.
- [ ] Reminders > Follow picks which reminder the watch follows; the X removes it and Undo brings it back.
- [ ] At the due time a card rings (louder each time) until you tap Done or Snooze 10 min.
- [ ] Settings > Motion > Preview runs each motion for about 20 seconds and ends with the card ringing.
- [ ] Settings > Finish changes the colours; Settings > Ringtone plays each sound. Both persist after a refresh.

## Phone (the installed PWA)

- [ ] Open the address in Chrome, then menu > Install app. The eagle icon appears on the home screen.
- [ ] The installed app opens with no error screen, and the icons and fonts are drawn.
- [ ] Allow notifications when asked.
- [ ] For testing, set Quiet hours and Quiet hours end to the same time in Settings (this switches them off).
- [ ] Keep the app open, set a reminder two minutes ahead, and wait. The watch arrives at the goal, the card rings and the notification shows.
- [ ] Leave it unanswered: the chime repeats, louder each time, until you tap Done or Snooze 10 min.
- [ ] Snooze 10 min: the reminder moves ten minutes on.
- [ ] Close the app completely and reopen it: the reminders are still listed.
- [ ] Turn Reminders off in Settings: a new reminder does not notify.

## Phrases the parser understands

| You type | Result |
|---|---|
| Call Mum in 2 hours | 2 hours from now |
| Gym Fri at 6pm | the coming Friday, 18:00 |
| Team sync every Monday at 10am | repeats weekly, from the coming Monday |
| Lunch at noon | 12:00 (tomorrow if noon has passed) |
| Pay rent Oct 15 | 15 Oct, 09:00 (next year if the date has passed) |
| Review budget next week | 7 days on, 09:00 |
| Buy 2 apples | the 2 stays in the title |
| Call Dad about Sunday | Sunday stays in the title (it is not a date) |

Words win until you touch the day or time controls; then the controls win.

## Automated checks

`npm run typecheck`, `npm test`, `npm run verify:pwa` and `npm run build:web` run in CI on every push.
