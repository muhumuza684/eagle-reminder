export type Mutation = { id: string; clientId: string; revision: number; operation: "create" | "update" | "delete" | "restore"; payload: unknown; attempts: number; createdAt: string; nextAttemptAt: string };

export function enqueueMutation(queue: Mutation[], mutation: Omit<Mutation, "attempts" | "createdAt" | "nextAttemptAt">, now = new Date()): Mutation[] {
  const item: Mutation = { ...mutation, attempts: 0, createdAt: now.toISOString(), nextAttemptAt: now.toISOString() };
  return [...queue.filter(m => m.clientId !== item.clientId || m.revision !== item.revision), item];
}

export function nextReadyMutation(queue: Mutation[], now = new Date()): Mutation | undefined {
  return [...queue].filter(m => new Date(m.nextAttemptAt).getTime() <= now.getTime()).sort((a,b) => a.createdAt.localeCompare(b.createdAt))[0];
}

export function retryMutation(m: Mutation, now = new Date()): Mutation {
  const attempts = m.attempts + 1;
  const delayMs = Math.min(60 * 60_000, 1000 * 2 ** Math.min(attempts, 10));
  return { ...m, attempts, nextAttemptAt: new Date(now.getTime() + delayMs).toISOString() };
}
