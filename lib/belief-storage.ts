import AsyncStorage from "@/lib/secure-storage";
import type { HistoryItem } from "@/lib/intelligence/beliefs";

/**
 * Self-contained on purpose: uses the same AsyncStorage-via-secure-storage
 * pattern confirmed across preferences.ts and local-data.ts, rather than
 * assuming an export shape in local-data.ts I haven't seen in full.
 */

const BELIEF_CORRECTIONS_KEY = "deagle-belief-corrections-v1";

export async function loadBeliefCorrections(): Promise<HistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(BELIEF_CORRECTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveBeliefCorrections(corrections: HistoryItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(BELIEF_CORRECTIONS_KEY, JSON.stringify(corrections));
  } catch {
    // Non-fatal -- corrections just don't persist this session, same
    // degrade-gracefully pattern as writeJsonSafely elsewhere in the app.
  }
}

export async function appendBeliefCorrections(newItems: HistoryItem[]): Promise<HistoryItem[]> {
  const current = await loadBeliefCorrections();
  const next = [...current, ...newItems];
  await saveBeliefCorrections(next);
  return next;
}
