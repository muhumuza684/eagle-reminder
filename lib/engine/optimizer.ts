export type Candidate={id:string;priority:number;risk:number;effort:number;deadlinePressure:number};
export function rankCandidates(items:Candidate[]):Candidate[]{return [...items].sort((a,b)=>(b.priority+b.risk+b.deadlinePressure-b.effort)-(a.priority+a.risk+a.deadlinePressure-a.effort));}
