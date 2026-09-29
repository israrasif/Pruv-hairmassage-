import AsyncStorage from "@react-native-async-storage/async-storage";
// SDK 54+ made a new File/Directory-based API the default export of
// expo-file-system. Our code uses the older documentDirectory/copyAsync
// style API, which is still fully supported under this legacy entrypoint.
import * as FileSystem from "expo-file-system/legacy";
import { Session, Technique, VaultPhoto, Thread } from "@/types";
import { toLocalDateISO } from "./date";

const KEYS = {
  SESSIONS: "@hair_massage/sessions",
  TECHNIQUES: "@hair_massage/techniques",
  VAULT: "@hair_massage/vault",
  THREADS: "@hair_massage/threads",
};

const VAULT_DIR = FileSystem.documentDirectory + "vault/";

// ---------- Techniques / Preferences ----------

export const DEFAULT_TECHNIQUES: Technique[] = [
  { id: "scalp", label: "Scalp Massage", enabled: true },
  { id: "oil", label: "Oil Treatment", enabled: true },
  { id: "steam", label: "Steam Therapy", enabled: false },
  { id: "postwash", label: "Post-Wash Care", enabled: false },
];

export async function getTechniques(): Promise<Technique[]> {
  const raw = await AsyncStorage.getItem(KEYS.TECHNIQUES);
  if (!raw) return DEFAULT_TECHNIQUES;
  try {
    return JSON.parse(raw) as Technique[];
  } catch {
    return DEFAULT_TECHNIQUES;
  }
}

export async function saveTechniques(techniques: Technique[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.TECHNIQUES, JSON.stringify(techniques));
}

// ---------- Sessions ----------

export async function getSessions(): Promise<Session[]> {
  const raw = await AsyncStorage.getItem(KEYS.SESSIONS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Session[];
  } catch {
    return [];
  }
}

export async function addSession(session: Session): Promise<Session[]> {
  const sessions = await getSessions();
  const updated = [session, ...sessions];
  await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(updated));
  return updated;
}

// ---------- Vault (photos) ----------

async function ensureVaultDir() {
  const info = await FileSystem.getInfoAsync(VAULT_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(VAULT_DIR, { intermediates: true });
  }
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
