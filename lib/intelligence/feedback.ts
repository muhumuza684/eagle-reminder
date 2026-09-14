export type Feedback='useful'|'not_useful'|'incorrect'|'irrelevant';
export type FeedbackEvent={recommendationId:string; feedback:Feedback; createdAt:string};
export function usefulnessRate(events:FeedbackEvent[]):number{const judged=events.filter(e=>e.feedback==='useful'||e.feedback==='not_useful');return judged.length?events.filter(e=>e.feedback==='useful').length/judged.length:0;}
