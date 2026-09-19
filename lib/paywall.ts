/**
 * PAYWALL SCAFFOLD -- honest scope: this is the gating mechanism, not real
 * billing. isPaidUser() returning a hardcoded false is intentional and
 * correct for right now -- wire it to a real entitlement source (RevenueCat,
 * a server flag, whatever you choose) when you're ready to actually sell
 * the paid tier. Everything downstream (useFeatureGate) doesn't change when
 * that day comes -- only this one function does.
 */

export type PaidFeature =
  | "eagle-voice-alerts"
  | "lock-screen-alerts"
  | "urgent-sound"
  | "gentle-escalation"
  | "home-widget"
  | "signal-charts"
  | "commitment-profile"
  | "next-of-kin";

export async function isPaidUser(): Promise<boolean> {
  return false;
}

export function useFeatureGate(_feature: PaidFeature) {
  // Deliberately not a real React hook (no state/effect) yet -- swap the
  // body for a real subscription-status hook once entitlements exist.
  // Kept as a function named like a hook so call sites don't need to
  // change shape later, just this implementation.
  return { isUnlocked: false as boolean };
}
