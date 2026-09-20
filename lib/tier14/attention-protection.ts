export type AttentionPolicy={quiet:boolean;maxInterruptionsPerHour:number;urgentBypass:boolean};
export type Interruption={urgent:boolean;minutesSinceLast:number};
export function allowInterruption(p:AttentionPolicy,x:Interruption,countThisHour:number){
  if(p.quiet && !(p.urgentBypass&&x.urgent)) return false;
  if(x.urgent&&p.urgentBypass)return true;
  return countThisHour<p.maxInterruptionsPerHour && x.minutesSinceLast>=10;
}
