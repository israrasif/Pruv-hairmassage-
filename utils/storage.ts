import AsyncStorage from "@react-native-async-storage/async-storage";
// SDK 54+ made a new File/Directory-based API the default export of
// expo-file-system. Our code uses the older documentDirectory/copyAsync
// style API, which is still fully supported under this legacy entrypoint.
import * as FileSystem from "expo-file-system/legacy";
import { Session, Activity, VaultPhoto, Thread } from "@/types";
import { toLocalDateISO } from "./date";
import { requestSync } from "@/utils/syncSignal";

const KEYS = {
  SESSIONS: "@hair_massage/sessions",
  ACTIVITIES: "@hair_massage/activities",
  VAULT: "@hair_massage/vault",
  THREADS: "@hair_massage/threads",
};

// Key used before the Technique -> Activity rename. Read once as a fallback so
// existing on-device preferences are not lost.
const LEGACY_TECHNIQUES_KEY = "@hair_massage/techniques";

const VAULT_DIR = FileSystem.documentDirectory + "vault/";

// ---------- Activities / Preferences ----------

export const DEFAULT_ACTIVITIES: Activity[] = [
  { id: "scalp", label: "Scalp Massage", enabled: true },
  { id: "oil", label: "Oil Treatment", enabled: true },
  { id: "steam", label: "Steam Therapy", enabled: false },
  { id: "postwash", label: "Post-Wash Care", enabled: false },
];

export const ACTIVITY_CATALOG: Activity[] = [
  ...DEFAULT_ACTIVITIES,
  { id: "exfoliate", label: "Scalp Exfoliation", enabled: false },
  { id: "dermaroll", label: "Derma Rolling", enabled: false },
  { id: "comb", label: "Wooden Comb Massage", enabled: false },
  { id: "mask", label: "Hair Mask", enabled: false },
  { id: "serum", label: "Scalp Serum", enabled: false },
  { id: "rinse", label: "Herbal Rinse", enabled: false },
];

export async function getActivities(): Promise<Activity[]> {
  const raw =
    (await AsyncStorage.getItem(KEYS.ACTIVITIES)) ??
    (await AsyncStorage.getItem(LEGACY_TECHNIQUES_KEY));
  if (!raw) return DEFAULT_ACTIVITIES;
  try {
    return JSON.parse(raw) as Activity[];
  } catch {
    return DEFAULT_ACTIVITIES;
  }
}

export async function saveActivities(activities: Activity[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
  requestSync();
}

// ---------- Sessions ----------

// Sessions saved before the rename have a `techniques` field instead of
// `activities`. Normalise them on read so old data keeps working.
type StoredSession = Omit<Session, "activities"> & {
  activities?: string[];
  techniques?: string[];
};

export async function getSessions(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(KEYS.SESSIONS);
  if (!raw) return [];
  try {
    const stored = JSON.parse(raw) as StoredSession[];
    return stored.map(({ techniques, ...rest }) => ({
      ...rest,
      activities: rest.activities ?? techniques ?? [],
    }));
  } catch {
    return [];
  }
}

export async function addSession(session: Session): Promise<Session[]> {
  const sessions = await getSessions();
  const updated = [session, ...sessions];
  await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(updated));
  requestSync();
  return updated;
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
}

export async function saveActivitiesSilently(
  activities: Activity[],
): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVITIES, JSON.stringify(activities));
}

export async function resetActivities(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.ACTIVITIES, LEGACY_TECHNIQUES_KEY]);
}

// ---------- Vault (photos) ----------

export async function ensureVaultDir() {
  const info = await FileSystem.getInfoAsync(VAULT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
  }
}

export function vaultFileUri(id: string) {
  return `${VAULT_DIR}${id}.jpg`;
}

export async function saveVaultPhotos(photos: VaultPhoto[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.VAULT, JSON.stringify(photos));
}

export async function getVaultPhotos(): Promise<VaultPhoto[]> {
  const raw = await AsyncStorage.getItem(KEYS.VAULT);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as VaultPhoto[];
  } catch {
    return [];
  }
}

export async function addVaultPhoto(
  sourceUri: string,
  note?: string,
): Promise<VaultPhoto[]> {
  await ensureVaultDir();
  const id = `${Date.now()}`;
  const destUri = `${VAULT_DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: destUri });

  const now = new Date();
  const photo: VaultPhoto = {
    id,
    uri: destUri,
    dateISO: toLocalDateISO(now),
    timestamp: now.getTime(),
    note,
  };

  const existing = await getVaultPhotos();
  const updated = [photo, ...existing];
  await AsyncStorage.setItem(KEYS.VAULT, JSON.stringify(updated));
  return updated;
}

export async function deleteVaultPhoto(id: string): Promise<VaultPhoto[]> {
  const existing = await getVaultPhotos();
  const target = existing.find((p) => p.id === id);
  if (target) {
    try {
      await FileSystem.deleteAsync(target.uri, { idempotent: true });
    } catch {
      // ignore missing file
    }
  }
  const updated = existing.filter((p) => p.id !== id);
  await AsyncStorage.setItem(KEYS.VAULT, JSON.stringify(updated));
  return updated;
}

// ---------- Community (local mock; swap for a real backend later) ----------

const SEED_THREADS: Thread[] = [
  {
    id: "t1",
    title: "Best oils for dry scalp?",
    category: "Tips",
    messages: [
      {
        id: "m1",
        author: "Asha",
        text: "Coconut oil warmed slightly works wonders for me.",
        timestamp: Date.now() - 1000 * 60 * 60 * 5,
      },
      {
        id: "m2",
        author: "Priya",
        text: "Try rosemary oil mixed in, helped with regrowth too.",
        timestamp: Date.now() - 1000 * 60 * 60 * 3,
      },
    ],
  },
  {
    id: "t2",
    title: "30-day streak check-in!",
    category: "Progress",
    messages: [
      {
        id: "m3",
        author: "Kabir",
        text: "Just hit day 30, hair feels so much softer.",
        timestamp: Date.now() - 1000 * 60 * 60 * 20,
      },
    ],
  },
  {
    id: "t3",
    title: "How long per session is ideal?",
    category: "Questions",
    messages: [
      {
        id: "m4",
        author: "Neha",
        text: "I do 10 minutes daily, seems to be the sweet spot.",
        timestamp: Date.now() - 1000 * 60 * 60 * 30,
      },
    ],
  },
];

export async function getThreads(): Promise<Thread[]> {
  const raw = await AsyncStorage.getItem(KEYS.THREADS);
  if (!raw) {
    await AsyncStorage.setItem(KEYS.THREADS, JSON.stringify(SEED_THREADS));
    return SEED_THREADS;
  }
  try {
    return JSON.parse(raw) as Thread[];
  } catch {
    return SEED_THREADS;
  }
}

export async function addMessageToThread(
  threadId: string,
  text: string,
  author = "You",
): Promise<Thread[]> {
  const threads = await getThreads();
  const updated = threads.map((t) =>
    t.id === threadId
      ? {
          ...t,
          messages: [
            ...t.messages,
            { id: `${Date.now()}`, author, text, timestamp: Date.now() },
          ],
        }
      : t,
  );
  await AsyncStorage.setItem(KEYS.THREADS, JSON.stringify(updated));
  return updated;
}
