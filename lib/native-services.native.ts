// Native adapter kept isolated from the PWA bundle.
import { Linking } from 'react-native';
import * as Speech from 'expo-speech';
import type { Checkpoint } from './critical-cascade';
import { getLocalPreferences } from './preferences';

let notificationsPromise: Promise<typeof import("expo-notifications")> | null = null;

async function getNotifications() {
  if (!notificationsPromise) {
    notificationsPromise = import("expo-notifications").then((api) => {
      api.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      return api;
    });
  }

  return notificationsPromise;
}

export async function requestLocalNotificationPermission() {
  const Notifications = await getNotifications();
  const permissions = await Notifications.getPermissionsAsync();

  const status = permissions.granted
    ? permissions.status
    : (await Notifications.requestPermissionsAsync()).status;

  return status === "granted";
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
export async function openMeeting(provider: 'zoom' | 'meet', url?: string) {
  const target = url || (provider === 'zoom' ? 'https://zoom.us/join' : 'https://meet.google.com/');
  if (await Linking.canOpenURL(target)) {
    await Linking.openURL(target);
    return;
  }
  await Linking.openURL(target);
}

export async function scheduleCommitmentMeeting(title: string, date: string, time: string, provider: 'zoom' | 'meet', url?: string, muteWarning = false) {
  const [hour, minute] = time.split(':').map(Number);
  const [year, month, day] = date.split('-').map(Number);
  const target = url || (provider === 'zoom' ? 'https://zoom.us/join' : 'https://meet.google.com/');
  const meetingDate = new Date(year, month - 1, day, hour, minute);
  const warningDate = new Date(meetingDate.getTime() - 5 * 60 * 1000);
  const content = { data: { meetingProvider: provider, meetingUrl: target }, sound: 'default' as const };

  if (!muteWarning) {
    await (await getNotifications()).scheduleNotificationAsync({
      content: { ...content, title: 'Five-minute heads-up', body: `${title} starts in five minutes. Get ready to join.` },
      trigger: { type: (await getNotifications()).SchedulableTriggerInputTypes.DATE, date: warningDate },
    });
  }

  await (await getNotifications()).scheduleNotificationAsync({
    content: { ...content, title: `${provider === 'zoom' ? 'Zoom' : 'Google Meet'} time`, body: title },
    trigger: { type: (await getNotifications()).SchedulableTriggerInputTypes.DATE, date: meetingDate },
  });
}

export async function speakEagle(text: string) {
  const prefs = await getLocalPreferences();
  if (!prefs.voiceEnabled) return;
  if (await Speech.isSpeakingAsync()) await Speech.stop();
  Speech.speak(`This is Eagle. ${text}`, { language: 'en-US', rate: 0.92, pitch: 1.0 });
}

export async function scheduleCriticalCascade(commitmentId: string, title: string, checkpoints: Checkpoint[]): Promise<string[]> {
  const ids: string[] = [];
  const prefs = await getLocalPreferences();

  for (const checkpoint of checkpoints) {
    const when = new Date(checkpoint.dueAt);
    if (isWithinQuietHours(when, prefs)) {
      when.setHours(prefs.quietHoursEnd, 0, 0, 0);
      if (when.getTime() <= Date.now()) when.setDate(when.getDate() + 1);
    }
    if (when.getTime() <= Date.now()) continue;

    const body = checkpoint.stage === 'day_before'
      ? `One day left to finish "${title}". Tap to confirm you're still on track.`
      : `Three hours left for "${title}". Eagle needs a quick acknowledgment.`;

    const id = await (await getNotifications()).scheduleNotificationAsync({
      content: {
        title: 'Eagle · Don\'t let me forget',
        body,
        data: { route: '/', commitmentId, checkpointStage: checkpoint.stage },
        sound: 'default',
        categoryIdentifier: 'checkpoint-action',
      },
      trigger: { type: (await getNotifications()).SchedulableTriggerInputTypes.DATE, date: when },
    });
    ids.push(id);
  }

  return ids;
}

export async function cancelCriticalCascade(ids: string[]) {
  if (!ids.length) return;
const Notifications = await getNotifications();
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined),
    ),
  );
}

export async function speakCheckpointEscalation(title: string, stage: 'day_before' | 'three_hours') {
  const phrase = stage === 'day_before'
    ? `${title} is due tomorrow and hasn't been acknowledged.`
    : `${title} is due soon and hasn't been acknowledged.`;
  await speakEagle(phrase);
}
