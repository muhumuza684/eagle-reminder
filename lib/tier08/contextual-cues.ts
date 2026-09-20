export type Cue = {id:string; event:"app_open"|"morning_review"|"before_due"|"after_completion"|"custom"; commitmentId?:string; enabled:boolean};
export function shouldFire(cue:Cue,event:Cue["event"],commitmentId?:string){ return cue.enabled && cue.event===event && (!cue.commitmentId || cue.commitmentId===commitmentId); }
