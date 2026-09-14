export function mean(values:number[]):number{return values.length?values.reduce((a,b)=>a+b,0)/values.length:0;}
export function variance(values:number[]):number{if(values.length<2)return 0;const m=mean(values);return values.reduce((s,x)=>s+(x-m)**2,0)/(values.length-1);}
export function zScore(value:number,values:number[]):number{const sd=Math.sqrt(variance(values));return sd? (value-mean(values))/sd:0;}
