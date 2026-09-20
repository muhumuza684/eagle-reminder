export type RhythmWindow={label:string;startHour:number;endHour:number;strength:number};
export function bestWindow(hours:number[]):RhythmWindow|undefined{
  if(!hours.length)return undefined;
  const mean=hours.reduce((a,b)=>a+b,0)/hours.length;
  return {label:mean<12?"morning":mean<18?"afternoon":"evening",startHour:Math.max(0,Math.floor(mean)-1),endHour:Math.min(23,Math.ceil(mean)+1),strength:Math.min(1,hours.length/14)};
}
