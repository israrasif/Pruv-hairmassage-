// utils/vaultSync.ts
// Local-first sync: photos are always saved on the phone first (works offline),
// then pushed to Supabase when possible. Photos from other devices are pulled down.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { supabase } from "@/utils/supabase";
import { VaultPhoto } from "@/types";
import {
  getVaultPhotos,
  saveVaultPhotos,
  ensureVaultDir,
  vaultFileUri,
} from "@/utils/storage";

const BUCKET = "hair-photos";
const PENDING_DELETES_KEY = "@hair_massage/vault_pending_deletes";
const OWNER_KEY = "@hair_massage/vault_owner"; // which account the local photos belong to

const remotePath = (userId: string, id: string) => `${userId}/vault/${id}.jpg`;

async function getPendingDeletes(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_DELETES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function setPendingDeletes(ids: string[]) {
  await AsyncStorage.setItem(PENDING_DELETES_KEY, JSON.stringify(ids));
}

// Call after a photo is deleted locally. It's removed from the cloud on the
// next sync (immediately if online), so it can't come back from the cloud.
export async function queueRemoteDelete(id: string) {
  const pending = await getPendingDeletes();
  if (!pending.includes(id)) await setPendingDeletes([...pending, id]);
}

async function wipeLocalVault() {
  const photos = await getVaultPhotos();
  for (const p of photos) {
    try {
      await FileSystem.deleteAsync(p.uri, { idempotent: true });
    } catch {}
  }
  await saveVaultPhotos([]);
}

// How many local photos are not in the cloud yet
export async function countUnsyncedPhotos(): Promise<number> {
  const photos = await getVaultPhotos();
  return photos.filter((p) => !p.synced).length;
}

// Call on sign-out (after the user's photos are backed up). Removes this phone's local copy
// so the next person who signs in on this device doesn't inherit or upload it.
export async function clearLocalVault() {
  if (running) {
    try {
      await running; // let any sync in progress finish first
    } catch {}
  }
  await wipeLocalVault();
  await AsyncStorage.multiRemove([PENDING_DELETES_KEY, OWNER_KEY]);
}

async function runSync(): Promise<VaultPhoto[] | null> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return null; // signed out or offline: nothing to do

  // Safety net: if the local photos belong to a different account (e.g. the previous
  // user's session expired instead of signing out), clear them before syncing.
  const owner = await AsyncStorage.getItem(OWNER_KEY);
  if (owner && owner !== userId) {
    await wipeLocalVault();
    await setPendingDeletes([]);
  }
  await AsyncStorage.setItem(OWNER_KEY, userId);

  // 1. Apply deletions made on this phone
  const pending = await getPendingDeletes();
  const stillPending: string[] = [];
  for (const id of pending) {
    const { error: sErr } = await supabase.storage
      .from(BUCKET)
      .remove([remotePath(userId, id)]);
    const { error: dErr } = await supabase.from("vault_photos").delete().eq("id", id);
    if (sErr || dErr) stillPending.push(id);
  }
  await setPendingDeletes(stillPending);

  // 2. Push photos that aren't in the cloud yet
  const local = await getVaultPhotos();
  const uploadedIds: string[] = [];
  for (const p of local) {
    if (p.synced) continue;
    try {
      const bytes = await new File(p.uri).bytes();
      if (!bytes.length) continue;
      const path = remotePath(userId, p.id);
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (upErr) continue;
      const { error: rowErr } = await supabase.from("vault_photos").upsert({
        id: p.id,
        user_id: userId,
        photo_path: path,
        date_iso: p.dateISO,
        taken_at: p.timestamp,
        note: p.note ?? null,
      });
      if (rowErr) continue;
      uploadedIds.push(p.id);
    } catch {
      // try again on the next sync
    }
  }

  // 3. Pull photos that exist in the cloud but not on this phone
  const pulled: VaultPhoto[] = [];
  const removedIds = new Set<string>();
  const { data: rows, error: listErr } = await supabase.from("vault_photos").select("*");

  if (!listErr && rows) {
    const localIds = new Set(local.map((p) => p.id));
    const remoteIds = new Set(rows.map((r: any) => r.id as string));
    const pendingSet = new Set(stillPending);

    await ensureVaultDir();
    for (const r of rows as any[]) {
      if (localIds.has(r.id) || pendingSet.has(r.id)) continue;
      try {
        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(r.photo_path, 120);
        if (!signed?.signedUrl) continue;
        const dest = vaultFileUri(r.id);
        const res = await FileSystem.downloadAsync(signed.signedUrl, dest);
        if (res.status !== 200) continue;
        pulled.push({
          id: r.id,
          uri: dest,
          dateISO: r.date_iso,
          timestamp: Number(r.taken_at),
          note: r.note ?? undefined,
          synced: true,
        });
      } catch {
        // try again on the next sync
      }
    }

    // Photos deleted from another device: drop the local copy too
    for (const p of local) {
      if (p.synced && !remoteIds.has(p.id)) removedIds.add(p.id);
    }
  }

  // 4. Save, merging with the CURRENT local list (the user may have added a photo meanwhile)
  for (const id of removedIds) {
    try {
      await FileSystem.deleteAsync(vaultFileUri(id), { idempotent: true });
    } catch {}
  }
  const latest = await getVaultPhotos();
  const merged = latest
    .filter((p) => !removedIds.has(p.id))
    .map((p) => (uploadedIds.includes(p.id) ? { ...p, synced: true } : p));
  const have = new Set(merged.map((p) => p.id));
  for (const p of pulled) if (!have.has(p.id)) merged.push(p);
  merged.sort((a, b) => b.timestamp - a.timestamp);

  await saveVaultPhotos(merged);
  return merged;
}

// Only one sync at a time. If something changes while one is running, it runs once more after.
let running: Promise<VaultPhoto[] | null> | null = null;
let rerun = false;

export function syncVaultPhotos(): Promise<VaultPhoto[] | null> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    try {
      let result = await runSync();
      while (rerun) {
        rerun = false;
        result = await runSync();
      }
      return result;
    } catch {
      return null; // offline or a temporary error: photos stay safe locally
    } finally {
      running = null;
    }
  })();
  return running;
}