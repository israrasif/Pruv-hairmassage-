// utils/dailyLog.ts
// One check-in per day: sleep, physical activity, mood. Stored on the phone, keyed by local date.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestSync } from "@/utils/syncSignal";

const KEY = "@hair_massage/daily_logs";

export type DailyLog = {
  sleepHours?: number; // 0-12, step 0.5
  activityMin?: number; // 0-120, step 5
  mood?: number; // 1-5
  updatedAt?: number; // when this day was last edited (ms). The cloud sync keeps the newest edit.
};

export const MOOD_EMOJI = ["😞", "🙁", "😐", "🙂", "😄"];
export const MOOD_LABEL = ["Very low", "Low", "Okay", "Good", "Great"];

export async function getDailyLogs(): Promise<Record<string, DailyLog>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, DailyLog>) : {};
  } catch {
    return {};
  }
}

export async function getDailyLog(dateISO: string): Promise<DailyLog> {
  const all = await getDailyLogs();
  return all[dateISO] ?? {};
}

// Used by the cloud sync to write merged data (doesn't trigger another sync)
export async function replaceDailyLogs(all: Record<string, DailyLog>): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

// Saves only the fields you pass, keeping the rest of that day's check-in.
export async function saveDailyLog(
  dateISO: string,
  patch: Partial<DailyLog>,
): Promise<DailyLog> {
  const all = await getDailyLogs();
  const next = { ...(all[dateISO] ?? {}), ...patch, updatedAt: Date.now() };
  all[dateISO] = next;
  await replaceDailyLogs(all);
  requestSync();
  return next;
}

export const formatSleep = (h: number) => `${h % 1 === 0 ? h : h.toFixed(1)} h`;
export const formatActivity = (m: number) => (m === 0 ? "None" : `${m} min`);
export const formatMood = (m: number) =>
  `${MOOD_EMOJI[m - 1] ?? ""} ${MOOD_LABEL[m - 1] ?? ""}`.trim();