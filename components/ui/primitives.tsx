import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type PressableProps, type TextProps } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { spacing } from "@/constants/spacing";
import { radii } from "@/constants/radii";
import { typography } from "@/constants/typography";

// ---- Typography primitives -------------------------------------------
// Every screen currently hand-writes its own <Text style={{ fontSize: N }}>.
// These map 1:1 onto the typography scale so text styling stops being a
// per-screen decision.

type AppTextProps = TextProps & { color?: string };

function makeText(variant: keyof typeof typography) {
  return function AppText({ style, color, ...props }: AppTextProps) {
    const c = useColors();
    return <Text style={[typography[variant], { color: color ?? c.foreground }, style]} {...props} />;
  };
}

export const Display = makeText("display");
export const Title = makeText("title");
export const Subtitle = makeText("subtitle");
export const Body = makeText("body");
export const BodySmall = makeText("bodySmall");
export const Caption = makeText("caption");
export const Eyebrow = makeText("eyebrow");
export const Label = makeText("label");

// ---- AppCard ------------------------------------------------------------
// FIX: was styled with backgroundColor: c.background — the same token as
// the screen it sits on, so cards had no visual separation from the page
// besides a 1px border. Every real screen already uses c.surface for its
// own hand-rolled cards; this now matches that (correct) pattern instead
// of contradicting it.
type AppCardProps = { children: ReactNode; elevated?: boolean; style?: object };

export function AppCard({ children, elevated = false, style }: AppCardProps) {
  const c = useColors();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border },
        elevated && styles.cardElevated,
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ---- AppButton ------------------------------------------------------------
// Added a size prop — every screen currently reinvents button height/padding
// (34, 40, 42, 43, 48, 50, 54px all appear as "button" heights today).
type AppButtonSize = "sm" | "md" | "lg";

export function AppButton({
  label,
  variant = "primary",
  size = "md",
  ...props
}: PressableProps & { label: string; variant?: "primary" | "secondary" | "danger"; size?: AppButtonSize }) {
  const c = useColors();
  const sizeStyle = size === "sm" ? styles.buttonSm : size === "lg" ? styles.buttonLg : styles.buttonMd;
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      style={[
        styles.button,
        sizeStyle,
        {
          backgroundColor: variant === "primary" ? c.primary : variant === "danger" ? c.error : c.surface,
          borderColor: c.border,
        },
      ]}
    >
      <Text style={{ color: variant === "secondary" ? c.foreground : "#FFFFFF", fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.card, padding: spacing.lg, gap: spacing.md },
  cardElevated: {
    shadowColor: "#10242A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  button: { borderWidth: 1, borderRadius: radii.chip + 2, alignItems: "center", justifyContent: "center" },
  buttonSm: { minHeight: 36, paddingHorizontal: spacing.md },
  buttonMd: { minHeight: 48, paddingHorizontal: spacing.xl },
  buttonLg: { minHeight: 54, paddingHorizontal: spacing.xxl },
});