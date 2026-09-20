import type { EagleId, Commitment } from "../tier01/foundation";
export type Mutation =
  | { id:string; type:"create"; commitment:Commitment; createdAt:string }
  | { id:string; type:"update"; commitmentId:EagleId; patch:Partial<Commitment>; createdAt:string }
  | { id:string; type:"state"; commitmentId:EagleId; state:Commitment["state"]; createdAt:string };
export function enqueueMutation(queue: Mutation[], mutation: Mutation): Mutation[] {
  if (queue.some(x => x.id === mutation.id)) return queue.slice();
  return [...queue, mutation];
}
export function replayMutations(base: Commitment[], queue: Mutation[]): Commitment[] {
  const out = new Map(base.map(x => [x.id, {...x}]));
  for (const m of queue) {
    if (m.type === "create" && !out.has(m.commitment.id)) out.set(m.commitment.id, {...m.commitment});
    if (m.type === "update" && out.has(m.commitmentId)) out.set(m.commitmentId, {...out.get(m.commitmentId)!, ...m.patch});
    if (m.type === "state" && out.has(m.commitmentId)) out.get(m.commitmentId)!.state = m.state;
  }
  return [...out.values()];
}
