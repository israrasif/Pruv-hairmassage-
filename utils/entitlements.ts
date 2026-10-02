// Stub. Replace the body of usePlan with RevenueCat customerInfo later.
export type Plan = 'free' | 'plus' | 'premium';

export function usePlan(): Plan {
  return 'free';
}

export const hasPlus = (plan: Plan) => plan === 'plus' || plan === 'premium';
export const hasPremium = (plan: Plan) => plan === 'premium';