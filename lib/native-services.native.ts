// Native adapter kept isolated from the PWA bundle.
import { Platform } from 'react-native';
import { getLocalPreferences } from './preferences';
import type { RingtoneKey } from './preferences-defaults';

const TONES: RingtoneKey[] = ['crystal', 'marimba', 'glass', 'musicbox'];
const TONE_NAMES: Record<RingtoneKey, string> = { crystal: 'Crystal chime', marimba: 'Marimba', glass: 'Glass bell', musicbox: 'Music box' };
// A reminder keeps nudging once a minute until it is answered (the app cancels the rest).
const REPEATS = 10;

let notificationsPromise: Promise<typeof import("expo-notifications")> | null = null;

async function getNotifications() {
  if (!notificationsPromise) {
    notificationsPromise = import("expo-notifications").then(async (api) => {
      api.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      // Android 13+ only shows the permission prompt once a channel exists. One channel per ringtone,
      // because Android fixes a channel's sound when it is created.
      if (Platform.OS === 'android') {
        for (const tone of TONES) {
          try {
            await api.setNotificationChannelAsync(`reminders-${tone}`, {
              name: `Reminders - ${TONE_NAMES[tone]}`,
              importance: api.AndroidImportance.HIGH,
              sound: `${tone}.wav`,
              vibrationPattern: [0, 250, 120, 250],
            });
          } catch {
            // The default channel still delivers the reminder.
          }
        }
      }

      return api;
    });
  }

  return notificationsPromise;
}

export async function requestLocalNotificationPermission() {
  try {
    const Notifications = await getNotifications();
    const permissions = await Notifications.getPermissionsAsync();

    const status = permissions.granted
      ? permissions.status
      : (await Notifications.requestPermissionsAsync()).status;

    return status === "granted";
  } catch {
    // Notifications are unavailable here (for example Expo Go on Android).
    return false;
  }
}

function isWithinQuietHours(
  when: Date,
  prefs: Awaited<ReturnType<typeof getLocalPreferences>>,
) {
  const hour = when.getHours();
  const start = prefs.quietHoursStart;
  const end = prefs.quietHoursEnd;

  if (start === end) return false;

  if (start < end) {
    return hour >= start && hour < end;
  }

  return hour >= start || hour < end;
}

export async function scheduleReminder(commitmentId: string, title: string, when: Date, tone: RingtoneKey = 'crystal'): Promise<string> {
  try {
    const prefs = await getLocalPreferences();
    if (!prefs.notificationsEnabled) return '';
    const first = new Date(when);
    if (isWithinQuietHours(first, prefs)) {
      first.setHours(prefs.quietHoursEnd, 0, 0, 0);
      if (first.getTime() <= Date.now()) first.setDate(first.getDate() + 1);
    }
    const Notifications = await getNotifications();
    const ids: string[] = [];
    for (let i = 0; i < REPEATS; i += 1) {
      const at = new Date(first.getTime() + i * 60_000);
      if (at.getTime() <= Date.now()) continue;
      ids.push(
        await Notifications.scheduleNotificationAsync({
          content: {
            title: i === 0 ? 'Reminder' : 'Still waiting - tap Done or Snooze',
            body: title,
            data: { route: '/', commitmentId },
            sound: `${tone}.wav`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: at,
            ...(Platform.OS === 'android' ? { channelId: `reminders-${tone}` } : {}),
          },
        }),
      );
    }
    return ids.join('|');
  } catch {
    return '';
  }
}

export async function cancelReminder(id: string) {
  try {
    const Notifications = await getNotifications();
    await Promise.all(id.split('|').filter(Boolean).map((one) => Notifications.cancelScheduledNotificationAsync(one).catch(() => undefined)));
  } catch {
    // Notifications unavailable - nothing to cancel.
  }
}