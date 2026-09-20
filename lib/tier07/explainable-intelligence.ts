export type Observation = { id:string; text:string; evidence:string[]; confidence:number; createdAt:string };
export function observation(id:string,text:string,evidence:string[],confidence:number,createdAt=new Date().toISOString()):Observation{
  return {id,text,evidence,confidence:Math.max(0,Math.min(1,confidence)),createdAt};
}
export function explain(o:Observation){ return `${o.text} (${Math.round(o.confidence*100)}% confidence). Evidence: ${o.evidence.join("; ")}.`; }
