export type ReminderPolicy = "none"|"single"|"advance"|"at_time"|"recovery"|"adaptive";
export type ReminderContext = {policy:ReminderPolicy; minutesUntilDue:number; missedRecently:number; quiet:boolean; userEnabled:boolean};
export function chooseReminder(c:ReminderContext):boolean{
  if(!c.userEnabled || c.quiet || c.policy==="none") return false;
  if(c.policy==="recovery") return c.missedRecently>0;
  if(c.policy==="at_time") return c.minutesUntilDue<=0;
  if(c.policy==="advance") return c.minutesUntilDue>0 && c.minutesUntilDue<=120;
  if(c.policy==="single") return c.minutesUntilDue<=60;
  return c.minutesUntilDue<=120 || c.missedRecently>0;
}
