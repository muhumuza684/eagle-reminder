// MERGED — see MERGE-NOTES.md. Everything above the "Don't Let Me Forget"
// section is unchanged from the base project. The cascade section below
// uses c_next_sequence's schedule/cancel pattern (it returns notification
// ids so a removed critical flag can actually cancel its pending
// notifications — a_section7's version had no cancellation path at all)
// combined with a_section7's separately-named escalation-speak helper.

import { Linking, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Speech from "expo-speech";
import type { Checkpoint } from "./critical-cascade";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
});

export async function registerForNotifications() {
  if (Platform.OS === "web") return null;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("rituals", { name: "Eagle rituals", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250], lightColor: "#0B6E69" });
  }
  const existing = await Notifications.getPermissionsAsync();
  const status = existing.status === "granted" ? existing.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return null;
  try { return (await Notifications.getExpoPushTokenAsync()).data; } catch { return null; }
}

export async function scheduleDailyRituals(briefingHour = 8, reviewHour = 22) {
  if (Platform.OS === "web") return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({ content: { title: "Good morning from Eagle", body: "Your day is ready. Open your Morning Briefing.", data: { route: "/" }, sound: "default" }, trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: briefingHour, minute: 0, repeats: true } });
  await Notifications.scheduleNotificationAsync({ content: { title: "Nightly Review", body: "Close the loop before midnight. Eagle is here when you are.", data: { route: "/review" }, sound: "default" }, trigger: { type: Notifications.SchedulableTriggerInputTypes.CALENDAR, hour: reviewHour, minute: 0, repeats: true } });
}

export async function openMeeting(provider: "zoom" | "meet", url?: string) { const target = url || (provider === "zoom" ? "https://zoom.us/join" : "https://meet.google.com/"); try { if (await Linking.canOpenURL(target)) { await Linking.openURL(target); return; } } catch { /* Fall through to browser fallback. */ } const browserUrl = target.startsWith("http") ? target : provider === "zoom" ? "https://zoom.us/join" : "https://meet.google.com/"; await Linking.openURL(browserUrl); }
export async function scheduleCommitmentMeeting(title: string, date: string, time: string, provider: "zoom" | "meet", url?: string, muteWarning = false) { if (Platform.OS === "web") return; const [hour, minute] = time.split(":").map(Number); const [year, month, day] = date.split("-").map(Number); const target = url || (provider === "zoom" ? "https://zoom.us/join" : "https://meet.google.com/"); const meetingDate = new Date(year, month - 1, day, hour, minute); const warningDate = new Date(meetingDate.getTime() - 5 * 60 * 1000); const content = { data: { meetingProvider: provider, meetingUrl: target }, sound: "default" as const }; if (!muteWarning) await Notifications.scheduleNotificationAsync({ content: { ...content, title: "Five-minute heads-up", body: `${title} starts in five minutes. Get ready to join.` }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: warningDate } }); await Notifications.scheduleNotificationAsync({ content: { ...content, title: `${provider === "zoom" ? "Zoom" : "Google Meet"} time`, body: title }, trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: meetingDate } }); }

export async function speakEagle(text: string) {
  if (Platform.OS === "web") return;
  if (await Speech.isSpeakingAsync()) await Speech.stop();
  Speech.speak(`This is Eagle. ${text}`, { language: "en-US", rate: 0.92, pitch: 1.0 });
}

// --- "Don't Let Me Forget" — exactly two checkpoints (FR-G1, FR-G2, FR-G3) ---

/**
 * Schedules local notifications for exactly the two given checkpoints and
 * returns their notification identifiers so the caller can cancel them if
 * the critical flag is later removed. Checkpoints already in the past are
 * skipped rather than fired immediately.
 */
export async function scheduleCriticalCascade(commitmentId: string, title: string, checkpoints: Checkpoint[]): Promise<string[]> {
  if (Platform.OS === "web") return [];
  const ids: string[] = [];
  for (const checkpoint of checkpoints) {
    const when = new Date(checkpoint.dueAt);
    if (when.getTime() <= Date.now()) continue;
    const body = checkpoint.stage === "day_before"
      ? `One day left to finish "${title}". Tap to confirm you're still on track.`
      : `Three hours left for "${title}". Eagle needs a quick acknowledgment.`;
    const id = await Notifications.scheduleNotificationAsync({
      content: { title: "Eagle · Don't let me forget", body, data: { route: "/", commitmentId, checkpointStage: checkpoint.stage }, sound: "default" },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
    });
    ids.push(id);
  }
  return ids;
}

/** Cancels any still-pending checkpoint notifications, e.g. when a critical flag is removed. */
export async function cancelCriticalCascade(ids: string[]) {
  if (Platform.OS === "web" || ids.length === 0) return;
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}

/**
 * FR-G3 escalation — call this once a pending checkpoint is confirmed
 * overdue (via `shouldEscalate` in lib/critical-cascade.ts). Fires the voice
 * alert; the caller persists the resulting "escalated" status via
 * `escalateCheckpoint` + the `checkpoints.update` mutation. This covers the
 * case where the app is foregrounded around the checkpoint's due time — true
 * background escalation while the app is closed requires a server-side push
 * job (tracked as a P1 follow-up in the native validation checklist).
 */
export async function speakCheckpointEscalation(title: string, stage: "day_before" | "three_hours") {
  const phrase = stage === "day_before" ? `${title} is due tomorrow and hasn't been acknowledged.` : `${title} is due soon and hasn't been acknowledged.`;
  await speakEagle(phrase);
}
