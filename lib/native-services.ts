import type { Checkpoint } from './critical-cascade';

let dailyReminderInterval: ReturnType<typeof setInterval> | null = null;
const webTimers = new Map<string, ReturnType<typeof setTimeout>>();

function browserTimer(key: string, when: number, title: string, body: string, data?: Record<string, unknown>) {
  const delay = when - Date.now();
  if (delay <= 0) return '';
  const existing = webTimers.get(key);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    webTimers.delete(key);
    void browserNotification(title, body, data);
  }, Math.min(delay, 2_147_000_000));
  webTimers.set(key, timer);
  return key;
}

function browserNotificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

async function browserNotification(title: string, body: string, data?: Record<string, unknown>) {
  if (!browserNotificationsSupported()) return false;
  const NotificationApi = window.Notification;
  if (NotificationApi.permission === 'default') {
    await NotificationApi.requestPermission();
  }
  if (NotificationApi.permission !== 'granted') return false;
  try {
    new NotificationApi(title, { body, data });
    return true;
  } catch {
    return false;
  }
}

export async function registerForNotifications() {
  if (!browserNotificationsSupported()) return null;
  const permission = window.Notification.permission === 'granted'
    ? 'granted'
    : await window.Notification.requestPermission();
  return permission === 'granted' ? 'web-browser' : null;
}

export async function scheduleDailyRituals(briefingHour = 8, reviewHour = 22) {
  if (dailyReminderInterval) clearInterval(dailyReminderInterval);

  const check = async () => {
    if (!browserNotificationsSupported()) return;
    const permission = window.Notification.permission === 'granted'
      ? 'granted'
      : await window.Notification.requestPermission();
    if (permission !== 'granted') return;

    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const lastMorning = window.localStorage.getItem('deagle-pwa-morning-reminder');
    const lastNight = window.localStorage.getItem('deagle-pwa-night-reminder');

    if (now.getHours() === briefingHour && now.getMinutes() < 2 && lastMorning !== day) {
      await browserNotification('Good morning from Eagle', 'Your day is ready. Open your Morning Briefing.', { route: '/' });
      window.localStorage.setItem('deagle-pwa-morning-reminder', day);
    }

    if (now.getHours() === reviewHour && now.getMinutes() < 2 && lastNight !== day) {
      await browserNotification('Nightly Review', 'Close the loop before midnight. Eagle is here when you are.', { route: '/review' });
      window.localStorage.setItem('deagle-pwa-night-reminder', day);
    }
  };

  await check();
  dailyReminderInterval = setInterval(() => { void check(); }, 60_000);
}

export async function openMeeting(provider: 'zoom' | 'meet', url?: string) {
  const target = url || (provider === 'zoom' ? 'https://zoom.us/join' : 'https://meet.google.com/');
  if (typeof window !== 'undefined') window.open(target, '_blank', 'noopener,noreferrer');
}

export async function scheduleCommitmentMeeting(title: string, date: string, time: string, provider: 'zoom' | 'meet', _url?: string, muteWarning = false) {
  const [hour, minute] = time.split(':').map(Number);
  const [year, month, day] = date.split('-').map(Number);
  const meetingDate = new Date(year, month - 1, day, hour, minute);
  const warningDate = new Date(meetingDate.getTime() - 5 * 60 * 1000);
  if (!muteWarning) {
    browserTimer(`meeting-warning:${date}:${time}:${title}`, warningDate.getTime(), 'Eagle · Five-minute heads-up', `${title} starts in five minutes.`);
  }
  browserTimer(`meeting:${date}:${time}:${title}`, meetingDate.getTime(), `${provider === 'zoom' ? 'Zoom' : 'Google Meet'} time`, title);
}

export async function speakEagle(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  const utterance = new SpeechSynthesisUtterance(`This is Eagle. ${text}`);
  utterance.lang = 'en-US';
  utterance.rate = 0.92;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export async function scheduleCriticalCascade(commitmentId: string, title: string, checkpoints: Checkpoint[]) {
  const ids: string[] = [];
  for (const checkpoint of checkpoints) {
    const when = new Date(checkpoint.dueAt).getTime();
    const body = checkpoint.stage === 'day_before'
      ? `One day left to finish \"${title}\".`
      : `Three hours left for \"${title}\".`;
    const id = browserTimer(
      `checkpoint:${commitmentId}:${checkpoint.stage}`,
      when,
      'Eagle · Checkpoint',
      body,
      { route: '/', commitmentId, checkpointStage: checkpoint.stage },
    );
    if (id) ids.push(id);
  }
  return ids;
}


export async function cancelCriticalCascade(ids: string[]) {
  for (const id of ids) {
    const timer = webTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      webTimers.delete(id);
    }
  }
}

export async function speakCheckpointEscalation(title: string, stage: 'day_before' | 'three_hours') {
  const phrase = stage === 'day_before'
    ? `${title} is due tomorrow and hasn't been acknowledged.`
    : `${title} is due soon and hasn't been acknowledged.`;
  await browserNotification('Eagle · Checkpoint escalation', phrase);
  await speakEagle(phrase);
}

export async function notifyCriticalCheckpoint(title: string, stage: 'day_before' | 'three_hours') {
  const body = stage === 'day_before'
    ? `One day left to finish "${title}".`
    : `Three hours left for "${title}".`;
  return browserNotification('Eagle · Checkpoint', body, { route: '/' });
}
