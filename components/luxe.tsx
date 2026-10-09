import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { FONT } from "@/constants/fonts";
import { useTheme, type Palette } from "@/lib/theme";

/** A brushed-metal fill. A plain CSS gradient, so it can never go missing the way SVG gradients did. */
export const metalStyle = (c: Palette) =>
  ({ backgroundImage: `linear-gradient(135deg, ${c.m1}, ${c.m2} 55%, ${c.m1})` }) as unknown as ViewStyle;

export function MetalBg({ radius = 99 }: { radius?: number }) {
  const { finish: c } = useTheme();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius }, metalStyle(c)]} />;
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { finish: c } = useTheme();
  return (
    <View style={[{ borderWidth: 1, borderColor: c.bd, backgroundColor: c.cd, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14 }, style]}>
      {children}
    </View>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  const { finish: c } = useTheme();
  return <Text style={{ color: c.mut, fontFamily: FONT.strong, fontSize: 10, letterSpacing: 2.2, textTransform: "uppercase" }}>{children}</Text>;
}

type PillProps = {
  label: string;
  onPress: () => void;
  primary?: boolean;
  active?: boolean;
  big?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Pill({ label, onPress, primary, active, big, disabled, accessibilityLabel, style }: PillProps) {
  const { finish: c } = useTheme();
  const metal = primary || active;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        {
          borderWidth: metal ? 0 : 1,
          borderColor: c.bd,
          borderRadius: 99,
          overflow: "hidden",
          paddingVertical: big ? 14 : 8,
          paddingHorizontal: big ? 24 : 13,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {metal ? <MetalBg /> : null}
      <Text style={{ color: metal ? "#120d06" : c.ink, fontFamily: FONT.strong, fontSize: big ? 15 : 12 }}>{label}</Text>
    </Pressable>
  );
}

/** A numbered step heading: "1  What should I remind you about?" */
export function StepTitle({ n, children }: { n: number; children: ReactNode }) {
  const { finish: c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        <MetalBg />
        <Text style={{ color: "#120d06", fontFamily: FONT.strong, fontSize: 11 }}>{n}</Text>
      </View>
      <Text style={{ color: c.mut, fontFamily: FONT.strong, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", flexShrink: 1 }}>{children}</Text>
    </View>
  );
}
