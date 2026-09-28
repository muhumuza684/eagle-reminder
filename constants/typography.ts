import type { TextStyle } from "react-native";

export const typography = {
  display: {
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "700",
    letterSpacing: -0.9,
  } satisfies TextStyle,

  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    letterSpacing: -0.55,
  } satisfies TextStyle,

  subtitle: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "600",
  } satisfies TextStyle,

  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  } satisfies TextStyle,

  bodySmall: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "400",
  } satisfies TextStyle,

  caption: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  } satisfies TextStyle,

  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "800",
    letterSpacing: 1.7,
    textTransform: "uppercase",
  } satisfies TextStyle,

  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  } satisfies TextStyle,

  nav: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  } satisfies TextStyle,
} as const;
