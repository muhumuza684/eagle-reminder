import type { Commitment, CommitmentState } from "../tier01/foundation";
const transitions:Record<CommitmentState,CommitmentState[]> = {
 planned:["active","cancelled"], active:["blocked","completed","postponed","cancelled"],
 blocked:["active","cancelled"], completed:[], postponed:["active","cancelled"], cancelled:[]
};
export function canTransition(from:CommitmentState,to:CommitmentState){ return transitions[from].includes(to); }
export function transition(c:Commitment,to:CommitmentState):Commitment {
  if (!canTransition(c.state,to)) throw new Error(`Invalid transition ${c.state} -> ${to}`);
  return {...c,state:to};
}
