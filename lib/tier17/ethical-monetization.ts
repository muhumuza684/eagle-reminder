export type Entitlement="core"|"advanced_intelligence"|"advanced_automation"|"extended_history";
export type Plan="free"|"plus";
const free=new Set<Entitlement>(["core"]);
export function allowed(plan:Plan,e:Entitlement){ return plan==="plus" || free.has(e); }
export function shouldGateCore(){ return false; }
