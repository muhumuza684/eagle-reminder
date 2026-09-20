export type EagleId = string & { readonly __brand: "EagleId" };
export type CommitmentState = "planned" | "active" | "blocked" | "completed" | "postponed" | "cancelled";
export type CommitmentKind = "action" | "project" | "milestone" | "recurring";
export type Commitment = {
  id: EagleId; title: string; kind: CommitmentKind; state: CommitmentState;
  createdAt: string; dueAt?: string; nextAction?: string;
};
export type EagleResult<T> = { ok: true; value: T } | { ok: false; code: string; message: string };
export function eagleId(raw: string): EagleId {
  const v = raw.trim();
  if (!v) throw new Error("EagleId cannot be empty");
  return v as EagleId;
}
export function validateCommitment(c: Commitment): EagleResult<Commitment> {
  if (!c.title.trim()) return { ok:false, code:"TITLE_REQUIRED", message:"Commitment title is required." };
  if (!c.id) return { ok:false, code:"ID_REQUIRED", message:"Commitment id is required." };
  return { ok:true, value:c };
}
