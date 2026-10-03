// Web adapter: reminders use in-page timers and browser notifications,
// so they fire while the tab or the installed app is open.

const webTimers = new Map<string, ReturnType<typeof setTimeout>>();

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

  // Chrome on Android refuses `new Notification(...)`; it only allows notifications that are
  // shown through the service worker. Use that whenever a service worker is registered.
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, { body, data, icon: '/icon.png' });
        return true;
      }
    }
  } catch {
    // fall through to the page-level API below
  }

  try {
    new NotificationApi(title, { body, data });
    return true;
  } catch {
    return false;
  }
}

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

export async function requestLocalNotificationPermission() {
  if (!browserNotificationsSupported()) return false;
  const permission =
    window.Notification.permission === 'granted'
      ? 'granted'
      : await window.Notification.requestPermission();
  return permission === 'granted';
}

export async function scheduleReminder(commitmentId: string, title: string, when: Date): Promise<string> {
  return browserTimer(`reminder:${commitmentId}`, when.getTime(), 'Reminder', title, { route: '/', commitmentId });
}

export async function cancelReminder(id: string) {
  const timer = webTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    webTimers.delete(id);
  }
}