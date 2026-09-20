export type PrincipleCheck={id:string;name:string;pass:boolean;detail:string};
export type ReleaseAssessment={ready:boolean;checks:PrincipleCheck[]};
export function assessRelease(checks:PrincipleCheck[]):ReleaseAssessment{
  return {ready:checks.length>0 && checks.every(x=>x.pass),checks};
}
export const D_EAGLE_PRINCIPLES=[
  "user-sovereignty","local-first","privacy-by-default","explainable-intelligence",
  "context-over-spam","recovery-over-punishment","attention-protection",
  "accessible-by-default","reversible-automation","no-dark-patterns"
] as const;
