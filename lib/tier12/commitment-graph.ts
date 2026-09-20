export type GraphNode={id:string;type:"goal"|"project"|"milestone"|"action"};
export type GraphEdge={from:string;to:string;type:"contains"|"depends_on"|"blocks"};
export type CommitmentGraph={nodes:GraphNode[];edges:GraphEdge[]};
export function blockers(g:CommitmentGraph,nodeId:string){ return g.edges.filter(e=>e.to===nodeId&&e.type==="blocks").map(e=>e.from); }
export function dependents(g:CommitmentGraph,nodeId:string){ return g.edges.filter(e=>e.to===nodeId&&e.type==="depends_on").map(e=>e.from); }
