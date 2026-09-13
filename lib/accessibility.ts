// Small, consistent accessibility helpers, per the project handoff letter
// section 7 - icon-only controls need labels/roles and touch targets
// should be at least MIN_TOUCH_SIZE. Described in the handoff letter as
// already introduced; it was not actually present - this is the real
// implementation.

export const MIN_TOUCH_SIZE = 44;

export type IconButtonA11yProps = {
  accessibilityRole: "button";
  accessibilityLabel: string;
  accessibilityHint?: string;
  hitSlop: { top: number; bottom: number; left: number; right: number };
};

/**
 * visualSize is the icon's actual rendered size in px; hitSlop is computed
 * so the total tappable area meets MIN_TOUCH_SIZE even when the visual
 * icon itself is smaller.
 */
export function iconButtonA11y(label: string, visualSize: number, hint?: string): IconButtonA11yProps {
  const extra = Math.max(0, (MIN_TOUCH_SIZE - visualSize) / 2);
  return {
    accessibilityRole: "button",
    accessibilityLabel: label,
    ...(hint ? { accessibilityHint: hint } : {}),
    hitSlop: { top: extra, bottom: extra, left: extra, right: extra },
  };
}
