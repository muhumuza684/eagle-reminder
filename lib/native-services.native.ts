// Native adapter kept isolated from the PWA bundle.
import { Platform } from 'react-native';
import { getLocalPreferences } from './preferences';

let notificationsPromise: Promise<typeof import("expo-notifications")> | null = null;

// Reminders go to their own Android channel; iOS has no channels.
const androidChannel = Platform.OS === 'android' ? { channelId: 'reminders' } : {};

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

      // Android 13+ only shows the permission prompt once at least one channel exists.
      if (Platform.OS === 'android') {
        try {
          await api.setNotificationChannelAsync('reminders', {
            name: 'Reminders',
            importance: api.AndroidImportance.HIGH,
          });
        } catch {
          // The channel is optional - reminders still work on the default one.
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

export async function scheduleReminder(commitmentId: string, title: string, when: Date): Promise<string> {
  try {
    const prefs = await getLocalPreferences();
    if (!prefs.notificationsEnabled) return '';
    const at = new Date(when);
    if (isWithinQuietHours(at, prefs)) {
      at.setHours(prefs.quietHoursEnd, 0, 0, 0);
      if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
    }
    if (at.getTime() <= Date.now()) return '';
    const Notifications = await getNotifications();
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Reminder', body: title, data: { route: '/', commitmentId }, sound: 'default' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, ...androidChannel },
    });
  } catch {
    return '';
  }
}

export async function cancelReminder(id: string) {
  try {
    const Notifications = await getNotifications();
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Notifications unavailable - nothing to cancel.
  }
}