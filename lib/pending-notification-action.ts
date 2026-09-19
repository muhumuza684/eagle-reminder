export type PendingCheckpointAck = { commitmentId: string; stage: "day_before" | "three_hours" } | null;

let pending: PendingCheckpointAck = null;

export function setPendingCheckpointAck(value: PendingCheckpointAck) {
  pending = value;
}

export function peekPendingCheckpointAck(): PendingCheckpointAck {
  return pending;
}

export function clearPendingCheckpointAck() {
  pending = null;
}
