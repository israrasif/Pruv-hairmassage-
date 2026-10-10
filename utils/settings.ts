// utils/settings.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestSync } from "@/utils/syncSignal";

export const SESSION_LENGTH_KEY = "@hair_massage/session_length_min";

export const MIN_SESSION_MIN = 1;
export const MAX_SESSION_MIN = 60;
export const DEFAULT_SESSION_MIN = 5;

export const clampMinutes = (n: number) =>
  Math.min(MAX_SESSION_MIN, Math.max(MIN_SESSION_MIN, Math.round(n)));

export async function getSessionLengthMin(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_LENGTH_KEY);
    const n = raw == null ? NaN : Number(raw);
    return Number.isFinite(n) ? clampMinutes(n) : DEFAULT_SESSION_MIN;
  } catch {
    return DEFAULT_SESSION_MIN;
  }
}

// Used by the cloud sync when it copies a value down (doesn't trigger another sync)
export async function applySessionLengthMin(min: number): Promise<void> {
  await AsyncStorage.setItem(SESSION_LENGTH_KEY, String(clampMinutes(min)));
}

export async function setSessionLengthMin(min: number): Promise<void> {
  await applySessionLengthMin(min);
  requestSync();
}