// MERGED â€” see MERGE-NOTES.md. Based on c_next_sequence's implementation:
// unlike a_section7's version (a pure type + merge-rule module with no
// storage), this one actually reads/writes AsyncStorage and mirrors onto
// the legacy single-purpose keys that index.tsx and dashboard.tsx already
// use â€” which matters, because a_section7 didn't have those files and
// would have silently orphaned the existing keys.
//
// One correction from a_section7's version worth keeping: shareTheme's
// default is "Signal", matching the actual theme names defined in
// dashboard.tsx's THEMES object (Signal / Dawn / Grove) â€” a_section7
// guessed "classic", which isn't a real option in the app.

import AsyncStorage from "@/lib/secure-storage";
import { DEFAULT_PREFERENCES, type EaglePreferences } from "@/lib/preferences-defaults";
export type { EaglePreferences } from "@/lib/preferences-defaults";
export { DEFAULT_PREFERENCES } from "@/lib/preferences-defaults";



export const PREFERENCES_KEY = "deagle-preferences-v1";

export async function getLocalPreferences(): Promise<EaglePreferences> {
  const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

// index.tsx and dashboard.tsx read a few of these preferences directly from
// their original single-purpose keys (predating this unified store). Mirror
// onto them so those screens keep working without also being rewritten here.
const LEGACY_KEYS: Partial<Record<keyof EaglePreferences, string>> = {
  meetingChimeMuted: "deagle-meeting-chime-muted",
  earlyWarningMuted: "deagle-early-warning-muted",
  briefingHour: "deagle-briefing-hour",
  reviewHour: "deagle-review-hour",
};

export async function setLocalPreferences(patch: Partial<EaglePreferences>): Promise<EaglePreferences> {
  const current = await getLocalPreferences();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
  const legacyPairs = Object.entries(patch)
    .filter(([key]) => key in LEGACY_KEYS)
    .map(([key, value]) => [LEGACY_KEYS[key as keyof EaglePreferences]!, String(value)] as [string, string]);
  if (legacyPairs.length) await AsyncStorage.multiSet(legacyPairs);
  return next;
}

/** Cloud values win when present (a device that hasn't synced yet still works from local). */
export function mergePreferences(local: EaglePreferences, cloud?: Partial<EaglePreferences> | null): EaglePreferences {
  if (!cloud) return local;
  return { ...local, ...cloud };
}



