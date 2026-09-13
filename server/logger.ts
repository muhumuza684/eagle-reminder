// Tier 2 #8 — structured logging on sync/scheduling/escalation paths.
//
// Before this, nothing anywhere logged a metric, error, or trace. If a
// checkpoint failed to escalate, or a sync retry kept failing, the only way
// to know was a user complaint — for a product whose entire pitch is
// "trust that Eagle didn't drop this," that's the wrong failure mode.
//
// Deliberately minimal: one function, structured JSON lines to stdout. This
// is NOT a logging platform integration (Datadog/Sentry/CloudWatch/etc.) —
// it's the seam those integrations plug into. Swap the body of `log()` for
// a real sink later; every call site in this codebase stays the same.

type LogLevel = "info" | "warn" | "error";

type LogEvent = {
  event: string;
  level: LogLevel;
  userId?: number;
  commitmentId?: number;
  checkpointId?: number;
  message?: string;
  [key: string]: unknown;
};

export function log({ event, level, ...fields }: LogEvent) {
  const line = { timestamp: new Date().toISOString(), event, level, ...fields };
  const serialized = JSON.stringify(line);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else console.log(serialized);
}
