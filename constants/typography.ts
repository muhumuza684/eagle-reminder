import type { TextStyle } from "react-native";

// A real type scale. Current screens define title sizes as 27, 30, and 32
// and eyebrow letter-spacing as 1.5, 2.1, and 2.2 depending on which file
// you're in — none of that is a deliberate design decision, it's drift.
// Every text style in the app should be one of these eight, not a
// one-off fontSize in a StyleSheet.create call.
export type TypographyVariant =
  | "display"
  | "title"
  | "subtitle"
  | "body"
  | "bodySmall"
  | "caption"
  | "eyebrow"
  | "label";

export const typography: Record<TypographyVariant, TextStyle> = {
  display: { fontSize: 30, fontWeight: "700", letterSpacing: -0.6, lineHeight: 36 },
  title: { fontSize: 22, fontWeight: "700", letterSpacing: -0.3, lineHeight: 28 },
  subtitle: { fontSize: 16, fontWeight: "600", lineHeight: 22 },
  body: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
  bodySmall: { fontSize: 13, fontWeight: "400", lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: "500", lineHeight: 16 },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.8, textTransform: "uppercase" },
  label: { fontSize: 10, fontWeight: "800", letterSpacing: 1.3, textTransform: "uppercase" },
};