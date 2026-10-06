// utils/entitlements.ts
// Reads the user's plan from the Supabase `user_plans` table (read-only for users).
// Later, RevenueCat webhooks can update that table; this file doesn't need to change.
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { supabase } from "@/utils/supabase";

export type Plan = "free" | "plus";
// Premium was removed for now. To bring it back: add it here, in the DB check constraint,
// in hasPlus/hasPremium, in the plans screen and the drawer.

export type PlanInfo = {
  plan: Plan;
  /** When the current paid period or trial ends. null = no expiry (free). */
  expiresAt: Date | null;
  isTrial: boolean;
};

const FREE: PlanInfo = { plan: "free", expiresAt: null, isTrial: false };

// One shared copy so every screen sees the same plan without re-fetching
let current: PlanInfo = FREE;
const listeners = new Set<(info: PlanInfo) => void>();
let started = false;

function setCurrent(next: PlanInfo) {
  current = next;
  listeners.forEach((l) => l(next));
}

export async function refreshPlan() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setCurrent(FREE);
      return;
    }
    // Row level security returns only this user's row
    const { data, error } = await supabase
      .from("user_plans")
      .select("plan, expires_at, is_trial")
      .maybeSingle();

    if (error) return; // offline or temporary error: keep what we have
    if (!data) {
      setCurrent(FREE);
      return;
    }

    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
    const expired = expiresAt !== null && expiresAt.getTime() < Date.now();
    const plan: Plan = !expired && data.plan === "plus" ? "plus" : "free";

    setCurrent({ plan, expiresAt, isTrial: !!data.is_trial });
  } catch {
    // keep the current value
  }
}

function ensureStarted() {
  if (started) return;
  started = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      setCurrent(FREE);
    } else {
      // Don't call Supabase directly inside this callback
      setTimeout(refreshPlan, 0);
    }
  });

  // Re-check when the app comes back to the foreground (e.g. after you edit the DB)
  AppState.addEventListener("change", (state) => {
    if (state === "active") refreshPlan();
  });

  refreshPlan();
}

export function usePlanInfo(): PlanInfo {
  const [info, setInfo] = useState<PlanInfo>(current);

  useEffect(() => {
    ensureStarted();
    listeners.add(setInfo);
    setInfo(current);
    return () => {
      listeners.delete(setInfo);
    };
  }, []);

  return info;
}

export function usePlan(): Plan {
  return usePlanInfo().plan;
}

/** Whole days left until expiresAt (never negative), or null if there is no expiry. */
export function daysLeft(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000));
}

export const hasPlus = (plan: Plan) => plan === "plus";
