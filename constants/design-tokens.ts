export const D_EAGLE_COLORS = {
  coral: "#F8444F",
  paper: "#F7F8F3",
  sky: "#78BDC4",
  navy: "#012C3D",

  primary: "#012C3D",
  accent: "#78BDC4",
  background: "#F7F8F3",
  surface: "#FFFFFF",
  surfaceSubtle: "#F3F7F5",

  foreground: "#012C3D",
  ink: "#012C3D",
  inkSoft: "#2E5663",
  muted: "#607D85",

  border: "#D4E1E3",
  borderStrong: "#B7D0D4",

  accentSoft: "#E7F4F5",
  coralSoft: "#FFF0F1",

  success: "#2E746D",
  warning: "#8A6840",
  error: "#F8444F",
  focus: "#78BDC4",

  white: "#FFFFFF",
} as const;

export const D_EAGLE_DARK_COLORS = {
  coral: "#F8444F",
  paper: "#071C26",
  sky: "#78BDC4",
  navy: "#012C3D",

  primary: "#78BDC4",
  accent: "#78BDC4",
  background: "#071C26",
  surface: "#0C2C3D",
  surfaceSubtle: "#103847",

  foreground: "#F7F8F3",
  ink: "#F7F8F3",
  inkSoft: "#C7DADD",
  muted: "#9DB8BE",

  border: "#285362",
  borderStrong: "#3C6D7A",

  accentSoft: "#163F4B",
  coralSoft: "#4B252B",

  success: "#78BDC4",
  warning: "#D6B27A",
  error: "#F8444F",
  focus: "#78BDC4",

  white: "#FFFFFF",
} as const;

export type DEagleColorToken = keyof typeof D_EAGLE_COLORS;
