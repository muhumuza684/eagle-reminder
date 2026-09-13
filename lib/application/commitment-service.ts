import { createClientId } from "@/lib/identity";
import { applyCommitmentPatch, type Commitment, type CommitmentPatch } from "@/lib/domain/commitment";

export function createCommitmentDraft(input: Omit<Commitment, "clientId" | "revision" | "updatedAt">, now: Date = new Date()): Commitment {
  return { ...input, clientId: createClientId(), revision: 1, updatedAt: now.toISOString() };
}

export function reviseCommitment(current: Commitment, patch: CommitmentPatch, now: Date = new Date()): Commitment {
  return applyCommitmentPatch(current, patch, now.toISOString());
}
