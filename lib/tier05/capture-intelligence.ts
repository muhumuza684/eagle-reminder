import type { CommitmentKind } from "../tier01/foundation";
export type CaptureProposal = { title:string; kind:CommitmentKind; dueAt?:string; nextAction?:string; confidence:number; reasons:string[] };
export function proposeCapture(input:string, now=new Date()):CaptureProposal {
  const text=input.trim();
  const lower=text.toLowerCase();
  const kind:CommitmentKind = /project|website|app|launch|report/i.test(text) ? "project" : "action";
  const dueMatch=lower.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
  const dueAt=dueMatch ? dueMatch[1] : undefined;
  const reasons:string[]=[];
  if (kind==="project") reasons.push("language suggests a multi-step outcome");
  if (dueAt) reasons.push("time expression detected");
  return {title:text.replace(/\b(by|before)\s+(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,"").trim() || text,
    kind,dueAt,nextAction:kind==="project"?"Define the next concrete step.":undefined,
    confidence:Math.min(0.98,0.55+reasons.length*0.18),reasons};
}
