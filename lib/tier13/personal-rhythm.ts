export type RhythmWindow={label:string;startHour:number;endHour:number;strength:number};
// Centre of the completion hours on a 24h clock. Hours are unwrapped across the largest gap
// so that e.g. [23, 1] is centred on midnight instead of noon.
function centerHour(hours:number[]):number{
  const s=[...hours].sort((a,b)=>a-b);
  let cut=0, widest=s[0]+24-s[s.length-1];
  for(let i=0;i<s.length-1;i++){ const gap=s[i+1]-s[i]; if(gap>widest){ widest=gap; cut=i+1; } }
  const unwrapped=s.map((h,i)=>i<cut?h+24:h);
  return (unwrapped.reduce((a,b)=>a+b,0)/unwrapped.length)%24;
}
export function bestWindow(hours:number[]):RhythmWindow|undefined{
  if(!hours.length)return undefined;
  const mean=centerHour(hours);
  return {label:mean<12?"morning":mean<18?"afternoon":"evening",startHour:Math.max(0,Math.floor(mean)-1),endHour:Math.min(23,Math.ceil(mean)+1),strength:Math.min(1,hours.length/14)};
}
