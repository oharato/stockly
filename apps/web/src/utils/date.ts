/**
 * 日付・時刻フォーマットユーティリティ
 */

// 日付キー生成 (YYYY-MM-DD)
export function getDateKey(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "その他";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return "その他";
  }
}

// タイムライングループ見出し用フォーマット
export function formatGroupTitle(dateKey: string, now: Date = new Date()): string {
  if (dateKey === "その他") return dateKey;

  const todayKey = getDateKey(now.toISOString());
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayKey = getDateKey(yesterday.toISOString());

  const parts = dateKey.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateKey;

  const [year, month, day] = parts;
  const dateObj = new Date(year, month - 1, day);
  if (isNaN(dateObj.getTime())) return dateKey;

  const days = ["日", "月", "火", "水", "木", "金", "土"];
  const dayOfWeek = days[dateObj.getDay()];

  let prefix = "";
  if (dateKey === todayKey) prefix = "今日 - ";
  else if (dateKey === yesterdayKey) prefix = "昨日 - ";

  return `${prefix}${month}月${day}日 (${dayOfWeek})`;
}

// 時刻フォーマット (HH:MM)
export function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
