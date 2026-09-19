/** Beta-Binomial shrinkage. Prevents a single miss (1/1 = 100%) from
 * reading as certainty. Converges toward the raw rate only as evidence
 * (n) accumulates. Beta(2,2) prior is a mild, symmetric starting belief. */
export function shrunkMissRate(missed: number, total: number, priorAlpha = 2, priorBeta = 2): number {
  if (total < 0 || missed < 0 || missed > total) throw new Error("Invalid missed/total");
  return (missed + priorAlpha) / (total + priorAlpha + priorBeta);
}

/** How much weight the raw sample carries yet, 0-1. Low early, rises with n. */
export function evidenceWeight(total: number, priorStrength = 4): number {
  return total / (total + priorStrength);
}
