import {
  D_EAGLE_COLORS,
  D_EAGLE_DARK_COLORS,
} from "./design-tokens";

export const BRAND = {
  coral: D_EAGLE_COLORS.coral,
  paper: D_EAGLE_COLORS.paper,
  sky: D_EAGLE_COLORS.sky,
  navy: D_EAGLE_COLORS.navy,
} as const;

export const BRAND_COLORS = {
  primary: D_EAGLE_COLORS.primary,
  accent: D_EAGLE_COLORS.accent,
  danger: D_EAGLE_COLORS.error,
  background: D_EAGLE_COLORS.background,
} as const;

export const BRAND_DARK_COLORS = D_EAGLE_DARK_COLORS;
