// A single 8-based spacing scale. Every margin/padding/gap in the app
// should come from here instead of inventing a new number per screen —
// that's the difference between "designed" and "assembled".
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export type SpacingToken = keyof typeof spacing;