export type CommitmentStatus = "active" | "completed" | "rescheduled" | "missed";
export type RiskState = "stable" | "at_risk" | "rescued" | "missed";
export type Priority = "high" | "medium" | "low";

export type Commitment = {
  clientId: string;
  serverId?: number;
  revision: number;
  title: string;
  category: string;
  scheduledDate: string;
  timeStart: string;
  timeEnd: string;
  priority: Priority;
  status: CommitmentStatus;
  riskState: RiskState;
  critical: boolean;
  criticalDeadline?: string;
  meetingProvider?: "zoom" | "meet";
  meetingUrl?: string;
  warningMuted?: boolean;
  deletedAt?: string;
  updatedAt: string;
};

export type CommitmentPatch = Partial<Omit<Commitment, "clientId" | "serverId" | "revision" | "updatedAt">>;

export function applyCommitmentPatch(current: Commitment, patch: CommitmentPatch, updatedAt: string): Commitment {
  return { ...current, ...patch, revision: current.revision + 1, updatedAt };
}
