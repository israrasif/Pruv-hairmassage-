// utils/dataSync.ts
// Local-first backup of everything except photos (photos use vaultSync.ts):
//   sessions (streaks and the Tracker are calculated from these), daily check-ins,
//   hair health questionnaire results, and settings (session length, reminders, activities).
// The phone is always the working copy (works offline). This file copies changes to Supabase
// and pulls down anything that exists in the cloud but not on this phone.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/utils/supabase";
import { Activity, Session } from "@/types";
import {
  getSessions,
  saveSessions,
  getActivities,
  saveActivitiesSilently,
  resetActivities,
} from "@/utils/storage";
import { DailyLog, getDailyLogs, replaceDailyLogs } from "@/utils/dailyLog";
import { QuizResult, getQuizResults, replaceQuizResults } from "@/utils/hairQuiz";
import {
  SESSION_LENGTH_KEY,
  applySessionLengthMin,
  getSessionLengthMin,
} from "@/utils/settings";
import {
  DEFAULT_REMINDER,
  REMINDER_KEY,
  ReminderSettings,
  applyReminderSettings,
  getReminderSettings,
  rescheduleReminders,
} from "@/utils/reminders";
import { setSyncHandler } from "@/utils/syncSignal";
import {
  PLAN_STORAGE_KEYS,
  PlanProgress,
  applyPlan,
  applyProgress,
  getPlan,
  getProgress,
} from "@/utils/planStore";
import type { Plan } from "@/utils/planBuilder";

const OWNER_KEY = "@hair_massage/data_owner"; // which account the local data belongs to
const SETTINGS_STATE_KEY = "@hair_massage/settings_sync_state";
const QUIZ_KEEP = 24; // the phone keeps the latest 24 questionnaire results

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// Reads every row of a table (pages of 1000). Returns null if anything fails.
async function fetchAll(table: string, columns: string, orderBy: string): Promise<any[] | null> {
  const PAGE = 1000;
  const rows: any[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(orderBy)
      .range(from, from + PAGE - 1);
    if (error || !data) {
      console.warn(`[sync] could not read ${table}:`, error?.message ?? "no data");
      return null;
    }
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

// ---------------------------------------------------------------- sessions
// Sessions are only ever added, never edited, so we just copy what's missing each way.
async function syncSessions(userId: string): Promise<boolean> {
  const remote = await fetchAll("massage_sessions", "id,date_iso,ts,duration_sec,activities", "id");
  if (!remote) return false;

  const local = await getSessions();
  const remoteIds = new Set(remote.map((r) => r.id as string));
  const localIds = new Set(local.map((s) => s.id));
  let ok = true;

  const toPush = local.filter((s) => !remoteIds.has(s.id));
  for (const part of chunk(toPush, 200)) {
    const { error } = await supabase.from("massage_sessions").upsert(
      part.map((s) => ({
        user_id: userId,
        id: s.id,
        date_iso: s.dateISO,
        ts: s.timestamp,
        duration_sec: s.durationSec,
        activities: s.activities ?? [],
      })),
      { onConflict: "user_id,id" },
    );
    if (error) {
      console.warn("[sync] upload failed:", error.message);
      ok = false;
    }
  }

  const toPull: Session[] = remote
    .filter((r) => !localIds.has(r.id))
    .map((r) => ({
      id: r.id,
      dateISO: r.date_iso,
      timestamp: Number(r.ts),
      durationSec: Number(r.duration_sec),
      activities: Array.isArray(r.activities) ? r.activities : [],
    }));

  if (toPull.length > 0) {
    const latest = await getSessions(); // read again: a session may have finished meanwhile
    const have = new Set(latest.map((s) => s.id));
    const merged = [...latest, ...toPull.filter((s) => !have.has(s.id))].sort(
      (a, b) => b.timestamp - a.timestamp,
    );
    await saveSessions(merged);
  }
  return ok;
}

// -------------------------------------------------------------- daily logs
// A day can be edited several times, so the newest edit wins (compared by updatedAt).
const logFromRow = (r: any): DailyLog => ({
  sleepHours: r.sleep_hours == null ? undefined : Number(r.sleep_hours),
  activityMin: r.activity_min == null ? undefined : Number(r.activity_min),
  mood: r.mood == null ? undefined : Number(r.mood),
  updatedAt: Number(r.updated_at_ms),
});

async function syncDailyLogs(userId: string): Promise<boolean> {
  const remote = await fetchAll(
    "daily_logs",
    "date_iso,sleep_hours,activity_min,mood,updated_at_ms",
    "date_iso",
  );
  if (!remote) return false;

  const local = await getDailyLogs();
  const remoteByDate = new Map(remote.map((r) => [r.date_iso as string, r]));
  const toPush: any[] = [];
  const fromCloud: Record<string, DailyLog> = {};

  for (const [date, log] of Object.entries(local)) {
    const r = remoteByDate.get(date);
    const localTs = log.updatedAt ?? 0;
    const remoteTs = r ? Number(r.updated_at_ms) : -1;
    if (!r || localTs > remoteTs) {
      toPush.push({
        user_id: userId,
        date_iso: date,
        sleep_hours: log.sleepHours ?? null,
        activity_min: log.activityMin ?? null,
        mood: log.mood ?? null,
        updated_at_ms: localTs || Date.now(),
      });
    } else if (remoteTs > localTs) {
      fromCloud[date] = logFromRow(r);
    }
  }
  for (const r of remote) {
    if (!(r.date_iso in local)) fromCloud[r.date_iso] = logFromRow(r);
  }

  let ok = true;
  for (const part of chunk(toPush, 200)) {
    const { error } = await supabase
      .from("daily_logs")
      .upsert(part, { onConflict: "user_id,date_iso" });
    if (error) {
      console.warn("[sync] upload failed:", error.message);
      ok = false;
    }
  }

  if (Object.keys(fromCloud).length > 0) {
    const latest = await getDailyLogs(); // read again in case you just moved a slider
    for (const [date, log] of Object.entries(fromCloud)) {
      const cur = latest[date];
      if (!cur || (log.updatedAt ?? 0) > (cur.updatedAt ?? 0)) latest[date] = log;
    }
    await replaceDailyLogs(latest);
  }
  return ok;
}

// ----------------------------------------------------------- quiz results
// Like sessions: results are only added, never edited.
async function syncQuizResults(userId: string): Promise<boolean> {
  const remote = await fetchAll("quiz_results", "id,date_iso,ts,score,sub,answers", "ts");
  if (!remote) return false;

  const local = await getQuizResults();
  const remoteIds = new Set(remote.map((r) => r.id as string));
  const localIds = new Set(local.map((q) => q.id));
  let ok = true;

  const toPush = local.filter((q) => !remoteIds.has(q.id));
  for (const part of chunk(toPush, 200)) {
    const { error } = await supabase.from("quiz_results").upsert(
      part.map((q) => ({
        user_id: userId,
        id: q.id,
        date_iso: q.dateISO,
        ts: q.timestamp,
        score: q.score,
        sub: q.sub,
        answers: q.answers,
      })),
      { onConflict: "user_id,id" },
    );
    if (error) {
      console.warn("[sync] upload failed:", error.message);
      ok = false;
    }
  }

  const recentRemote = remote.slice(-QUIZ_KEEP); // only the newest ones are kept on the phone
  const toPull: QuizResult[] = recentRemote
    .filter((r) => !localIds.has(r.id))
    .map((r) => ({
      id: r.id,
      dateISO: r.date_iso,
      timestamp: Number(r.ts),
      score: Number(r.score),
      sub: r.sub,
      answers: Array.isArray(r.answers) ? r.answers : [],
    }));

  if (toPull.length > 0) {
    const latest = await getQuizResults();
    const have = new Set(latest.map((q) => q.id));
    const merged = [...latest, ...toPull.filter((q) => !have.has(q.id))]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-QUIZ_KEEP);
    await replaceQuizResults(merged);
  }
  return ok;
}

// ---------------------------------------------------------------- settings
// One settings record per user. We remember what the settings looked like at the last sync,
// so we can tell whether THIS phone changed them (push) or only the cloud changed (pull).
type SettingsBlob = {
  sessionLengthMin: number;
  reminder: ReminderSettings;
  activities: Activity[];
  plan?: Plan | null; // the 12-week routine
  planProgress?: PlanProgress; // ticks and weekly answers
};

async function readLocalSettings(): Promise<SettingsBlob> {
  return {
    sessionLengthMin: await getSessionLengthMin(),
    reminder: await getReminderSettings(),
    activities: await getActivities(),
    plan: await getPlan(),
    planProgress: await getProgress(),
  };
}

async function applyRemoteSettings(data: Partial<SettingsBlob> | null, firstSync: boolean) {
  if (!data) return;
  if (typeof data.sessionLengthMin === "number") await applySessionLengthMin(data.sessionLengthMin);
  if (data.reminder) await applyReminderSettings({ ...DEFAULT_REMINDER, ...data.reminder });
  if (Array.isArray(data.activities) && data.activities.length > 0) {
    await saveActivitiesSilently(data.activities);
  }
  // On the very first sync, only take a plan from the cloud if there is one. After that, copy it
  // exactly, so "start over" on one phone also clears it on the others.
  if (data.plan !== undefined && (!firstSync || data.plan)) {
    await applyPlan(data.plan ?? null);
    if (data.planProgress) await applyProgress(data.planProgress);
  }
  await rescheduleReminders();
}

async function syncSettings(userId: string): Promise<boolean> {
  const { data: row, error } = await supabase
    .from("user_settings")
    .select("data, updated_at")
    .maybeSingle();
  if (error) {
    console.warn("[sync] could not read user_settings:", error.message);
    return false;
  }

  const rememberState = async (remoteUpdatedAt: string) => {
    const snapshot = JSON.stringify(await readLocalSettings());
    await AsyncStorage.setItem(SETTINGS_STATE_KEY, JSON.stringify({ snapshot, remoteUpdatedAt }));
  };

  const push = async (): Promise<boolean> => {
    const local = await readLocalSettings();
    const { data, error: upErr } = await supabase
      .from("user_settings")
      .upsert(
        { user_id: userId, data: local, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      )
      .select("updated_at")
      .single();
    if (upErr || !data) {
      console.warn("[sync] could not save user_settings:", upErr?.message ?? "no data");
      return false;
    }
    await rememberState(data.updated_at);
    return true;
  };

  if (!row) return push(); // nothing in the cloud yet: upload this phone's settings

  const stateRaw = await AsyncStorage.getItem(SETTINGS_STATE_KEY);
  const state = stateRaw ? (JSON.parse(stateRaw) as { snapshot: string; remoteUpdatedAt: string }) : null;

  if (!state) {
    // First sync on this phone and the account already has settings: the cloud copy wins
    await applyRemoteSettings(row.data as Partial<SettingsBlob>, true);
    await rememberState(row.updated_at);
    return true;
  }

  const localChanged = state.snapshot !== JSON.stringify(await readLocalSettings());
  if (localChanged) return push(); // changed on this phone since last sync

  if (state.remoteUpdatedAt !== row.updated_at) {
    // changed on another device
    await applyRemoteSettings(row.data as Partial<SettingsBlob>, false);
    await rememberState(row.updated_at);
  }
  return true;
}

// --------------------------------------------------------------- wipe data
async function wipeLocalUserData() {
  await saveSessions([]);
  await replaceDailyLogs({});
  await replaceQuizResults([]);
  await resetActivities();
  await AsyncStorage.multiRemove([SESSION_LENGTH_KEY, REMINDER_KEY, SETTINGS_STATE_KEY, ...PLAN_STORAGE_KEYS]);
  await rescheduleReminders(); // settings are back to defaults (off), so this cancels any reminders
}

/** Call on sign-out, after syncUserData(). Removes this phone's local copy of the account's data. */
export async function clearLocalUserData() {
  if (running) {
    try {
      await running; // let a sync in progress finish first
    } catch {}
  }
  await wipeLocalUserData();
  await AsyncStorage.removeItem(OWNER_KEY);
}

// ------------------------------------------------------------ run it all
async function runAll(): Promise<boolean> {
  const { data } = await supabase.auth.getSession(); // reads the saved login, works offline
  const userId = data.session?.user.id;
  if (!userId) {
    console.warn("[sync] skipped: not signed in");
    return false;
  }

  // Safety net: local data from a different account (e.g. a session that expired instead of
  // a proper sign-out) must never be uploaded to this account.
  const owner = await AsyncStorage.getItem(OWNER_KEY);
  if (owner && owner !== userId) await wipeLocalUserData();
  await AsyncStorage.setItem(OWNER_KEY, userId);

  const safe = (name: string, p: Promise<boolean>) =>
    p
      .then((ok) => {
        if (!ok) console.warn(`[sync] ${name} did not finish`);
        return ok;
      })
      .catch((e) => {
        console.warn(`[sync] ${name} failed:`, e?.message ?? e);
        return false;
      });
  const results = [
    await safe("settings", syncSettings(userId)),
    await safe("sessions", syncSessions(userId)),
    await safe("check-ins", syncDailyLogs(userId)),
    await safe("questionnaire", syncQuizResults(userId)),
  ];
  console.log("[sync] finished:", results.every(Boolean) ? "all backed up" : "something failed (see warnings above)");
  return results.every(Boolean);
}

// Only one sync at a time. If something changes while one runs, it runs once more afterwards.
let running: Promise<boolean> | null = null;
let rerun = false;

/** Resolves true if everything is backed up, false if anything failed (e.g. offline). */
export function syncUserData(): Promise<boolean> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    try {
      let ok = await runAll();
      while (rerun) {
        rerun = false;
        ok = await runAll();
      }
      return ok;
    } catch {
      return false;
    } finally {
      running = null;
    }
  })();
  return running;
}

// Let other files ask for a sync with requestSync()
setSyncHandler(() => {
  syncUserData();
});