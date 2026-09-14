export type Evidence = { source: string; value: number; observedAt: string };
export type Prediction = { score: number; confidence: number; explanation: string; evidence: Evidence[] };
export type Recommendation = { action: "prioritize"|"reschedule"|"decompose"|"review"; score: number; reason: string };
