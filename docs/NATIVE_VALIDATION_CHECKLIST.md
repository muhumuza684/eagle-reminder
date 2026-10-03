# D-Eagle Hub - device checklist

Run these after any change that touches reminders, storage or notifications.

## Web (`npx expo start --web`)

- [ ] The page loads without an error screen, and again after a refresh.
- [ ] Type "Call Mum in 2 minutes" and tap Set reminder. The card appears under Today.
- [ ] With the tab open, the browser notification appears at that time.
- [ ] Refresh before it fires: the reminder still fires.
- [ ] Done removes the card. Snooze 10m moves it. Change moves it to the day and time picked. Delete shows Undo for six seconds.

## Phone (an installed build, not Expo Go)

- [ ] The app opens with no red error screen.
- [ ] Allow notifications when asked.
- [ ] For testing, set Quiet hours and Quiet hours end to the same time in Settings (this switches them off).
- [ ] Set a reminder two minutes ahead and lock the screen. The notification arrives on time.
- [ ] Change the time of a reminder: only the new time notifies.
- [ ] Mark a reminder Done before it fires: no notification arrives.
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

## Automated checks

`npm run typecheck`, `npm test`, `npm run verify:pwa` and `npm run build:web` run in CI on every push.