export type PrivacyClass = "public" | "personal" | "sensitive";
export type TelemetryDecision = { allowed:boolean; reason:string };
const allowedKeys = new Set(["event","version","platform","durationMs","success"]);
export function telemetryDecision(key:string): TelemetryDecision {
  return allowedKeys.has(key) ? {allowed:true, reason:"approved operational metric"} :
    {allowed:false, reason:"unknown or potentially identifying field"};
}
export function notificationPreview(title:string, body:string, privacy:"minimal"|"full"): {title:string;body:string} {
  if (privacy === "full") return {title, body};
  return {title:"D-Eagle", body:"You have a commitment that needs attention."};
}
