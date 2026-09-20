export type VoiceIntent={kind:"create"|"complete"|"reschedule"|"query";text:string;target?:string;time?:string};
export function parseVoiceIntent(input:string):VoiceIntent{
  const t=input.trim(), l=t.toLowerCase();
  if(/\b(done|completed|finished)\b/.test(l)) return {kind:"complete",text:t,target:t.replace(/\b(done|completed|finished)\b/i,"").trim()};
  if(/\b(move|reschedule|postpone)\b/.test(l)) return {kind:"reschedule",text:t};
  if(/\b(what|which|show|list)\b/.test(l)) return {kind:"query",text:t};
  return {kind:"create",text:t};
}
