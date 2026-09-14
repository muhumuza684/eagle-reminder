const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizePlainText(value: string, maxLength = 255): string {
  return value.replace(CONTROL_CHARS, "").trim().slice(0, maxLength);
}

export function isSafeExternalUrl(value: string): boolean {
  try { const u = new URL(value); return u.protocol === "https:" && (u.hostname.endsWith("zoom.us") || u.hostname.endsWith("zoom.com") || u.hostname === "meet.google.com"); } catch { return false; }
}
