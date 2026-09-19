import { shrunkMissRate, evidenceWeight } from "./shrinkage";
import { circularTimeStats, formatMinutesAsClock, KAPPA_CONFIDENCE_THRESHOLD } from "./circular";

export type HistoryItem = { category: string; timeStartMinutes: number; missed: boolean };
export type Belief = { category: string; missRate: number; confidence: number; explanation: string };

const MIN_EVIDENCE = 3;

/**
 * Top 1-2 beliefs Eagle currently holds about the user, in plain language.
 * `history` should be every closed-out (completed or missed) commitment,
 * mapped to { category, timeStartMinutes (0-1439), missed }.
 */
export function getCommitmentBeliefs(history: HistoryItem[]): Belief[] {
  const byCategory = new Map<string, HistoryItem[]>();
  for (const item of history) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }
  const beliefs: Belief[] = [];
  for (const [category, items] of byCategory) {
    if (items.length < MIN_EVIDENCE) continue;
    const missed = items.filter((i) => i.missed).length;
    const missRate = shrunkMissRate(missed, items.length);
    const confidence = evidenceWeight(items.length);
    const missedTimes = items.filter((i) => i.missed).map((i) => i.timeStartMinutes);
    const stats = circularTimeStats(missedTimes);
    const timePhrase =
      stats && stats.kappa >= KAPPA_CONFIDENCE_THRESHOLD ? ` around ${formatMinutesAsClock(stats.meanMinutes)}` : "";
    beliefs.push({
      category,
      missRate,
      confidence,
      explanation: `You slip on ${category} commitments${timePhrase}. Based on ${missed} of your last ${items.length}.`,
    });
  }
  return beliefs.sort((a, b) => b.missRate * b.confidence - a.missRate * a.confidence).slice(0, 2);
}

/**
 * A user correction ("Not really") is worth more than one ordinary
 * observation — this is the Taste-Profile-style override. Call this,
 * store the returned history, and re-derive beliefs from it.
 */
export function correctBelief(history: HistoryItem[], category: string, wasAccurate: boolean): HistoryItem[] {
  const correctionWeight = 3;
  const synthetic: HistoryItem[] = Array.from({ length: correctionWeight }, () => ({
    category,
    timeStartMinutes: 0,
    missed: !wasAccurate,
  }));
  return [...history, ...synthetic];
}
