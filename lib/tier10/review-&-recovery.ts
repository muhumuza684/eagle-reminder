export type RecoveryChoice = "resume"|"split"|"reschedule"|"cancel"|"blocked";
export function recoveryPrompt(state:"missed"|"blocked"|"overdue"){ return state==="blocked"?"What is blocking this?":"What should happen next?"; }
export function applyRecovery(choice:RecoveryChoice):"active"|"postponed"|"cancelled"|"blocked"{
  if(choice==="resume"||choice==="split") return "active";
  if(choice==="reschedule") return "postponed";
  if(choice==="cancel") return "cancelled";
  return "blocked";
}
