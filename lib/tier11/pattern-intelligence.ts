export type HistoryPoint={completed:boolean; hour:number; size:"small"|"medium"|"large"};
export type Pattern={kind:"time"|"size"|"completion"; statement:string; sampleSize:number; confidence:number};
export function completionRate(xs:HistoryPoint[]){ return xs.length?xs.filter(x=>x.completed).length/xs.length:0; }
export function detectPatterns(xs:HistoryPoint[]):Pattern[]{
  if(xs.length<5) return [];
  const morning=xs.filter(x=>x.hour<12), evening=xs.filter(x=>x.hour>=18);
  const out:Pattern[]=[];
  if(morning.length>=3&&evening.length>=3){
    const mr=completionRate(morning),er=completionRate(evening);
    if(Math.abs(mr-er)>=0.2) out.push({kind:"time",statement:`Morning completion differs from evening by ${Math.round(Math.abs(mr-er)*100)} percentage points.`,sampleSize:xs.length,confidence:Math.min(.9,xs.length/20)});
  }
  return out;
}
