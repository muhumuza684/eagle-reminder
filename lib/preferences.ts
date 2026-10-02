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

export async function setLocalPreferences(patch: Partial<EaglePreferences>): Promise<EaglePreferences> {
  const current = await getLocalPreferences();
  const next = { ...current, ...patch };
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(next));
  return next;
}