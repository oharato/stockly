/**
 * Web Push & 内省リマインダー通知モジュール
 */

const REMINDER_ENABLED_KEY = "stockly_reminder_enabled";
const REMINDER_TIME_KEY = "stockly_reminder_time";

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  try {
    const perm = await Notification.requestPermission();
    return perm === "granted";
  } catch (err) {
    console.error("Failed to request notification permission:", err);
    return false;
  }
}

export function isReminderEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(REMINDER_ENABLED_KEY) === "true";
}

export function setReminderEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMINDER_ENABLED_KEY, String(enabled));
}

export function getReminderTime(): string {
  if (typeof window === "undefined") return "21:00";
  return localStorage.getItem(REMINDER_TIME_KEY) || "21:00";
}

export function setReminderTime(timeStr: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMINDER_TIME_KEY, timeStr);
}

/**
 * Service Worker 経由でリマインダー通知を送信
 */
export async function sendLocalReminder(
  title = "今日の学びをストックしよう 💡",
  body = "今日あった出来事や反省、気づきを1行メモしてみませんか？",
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && "showNotification" in reg) {
      await reg.showNotification(title, {
        body,
        icon: "/pwa-192x192.png",
        badge: "/pwa-192x192.png",
        tag: "daily-stock-reminder",
        data: { url: "/" },
      });
      return true;
    }

    // Service Worker が利用できない場合のネイティブ Notification フォールバック
    new Notification(title, {
      body,
      icon: "/pwa-192x192.png",
    });
    return true;
  } catch (err) {
    console.error("Failed to show notification:", err);
    return false;
  }
}
