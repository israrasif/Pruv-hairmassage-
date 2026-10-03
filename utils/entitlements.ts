// Stub. Replace the bodies of usePlan / usePlanInfo with RevenueCat customerInfo later.
export type Plan = 'free' | 'plus' | 'premium';

export function usePlan(): Plan {
  return 'free';
}

export type PlanInfo = {
  plan: Plan;
  /** When the current paid period or trial ends. null = no expiry (free). */
  expiresAt: Date | null;
  isTrial: boolean;
};

export function usePlanInfo(): PlanInfo {
  // With RevenueCat: entitlement.expirationDate and entitlement.periodType === 'TRIAL'.
  return { plan: usePlan(), expiresAt: null, isTrial: false };
}

/** Whole days left until expiresAt (never negative), or null if there is no expiry. */
export function daysLeft(expiresAt: Date | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000));
}

export const hasPlus = (plan: Plan) => plan === 'plus' || plan === 'premium';
export const hasPremium = (plan: Plan) => plan === 'premium';