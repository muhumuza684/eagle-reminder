// Split out of a_section7's critical-checkpoints.ts: this rule is about
// meeting five-minute warnings, not the critical-commitment cascade, so it
// gets its own module (single responsibility) rather than living inside
// critical-cascade.ts.

/**
 * Warning precedence rule used across meeting reminders: an explicit
 * per-commitment override always wins over the global Settings toggle.
 * `override` is `undefined` when the user has never set one for this
 * commitment, in which case the global preference applies.
 */
export function resolveWarningMuted(globalMuted: boolean, override?: boolean): boolean {
  return typeof override === "boolean" ? override : globalMuted;
}
