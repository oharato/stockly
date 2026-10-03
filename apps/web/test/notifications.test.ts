import { describe, it, expect, beforeEach } from "vite-plus/test";
import {
  isReminderEnabled,
  setReminderEnabled,
  getReminderTime,
  setReminderTime,
} from "../src/lib/notifications";

// Node 環境での localStorage モック
const mockStore = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => mockStore.get(key) ?? null,
  setItem: (key: string, value: string) => mockStore.set(key, String(value)),
  removeItem: (key: string) => mockStore.delete(key),
  clear: () => mockStore.clear(),
};

describe("Notifications Module", () => {
  beforeEach(() => {
    mockStore.clear();
    // グローバル window & localStorage モック
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = mockLocalStorage;
  });

  it("should get and set reminder enabled state in localStorage", () => {
    expect(isReminderEnabled()).toBe(false);
    setReminderEnabled(true);
    expect(isReminderEnabled()).toBe(true);
    setReminderEnabled(false);
    expect(isReminderEnabled()).toBe(false);
  });

  it("should get and set reminder time with default 21:00", () => {
    expect(getReminderTime()).toBe("21:00");
    setReminderTime("22:30");
    expect(getReminderTime()).toBe("22:30");
  });
});
