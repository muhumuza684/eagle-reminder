import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { FONT } from "@/constants/fonts";
import { useTheme } from "@/lib/theme";

/** A brushed-metal fill that sits behind a control. */
export function MetalBg({ radius = 99 }: { radius?: number }) {
  const { finish: c } = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: "hidden" }]}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="mgb" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={c.m1} />
            <Stop offset="0.55" stopColor={c.m2} />
            <Stop offset="1" stopColor={c.m1} />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#mgb)" />
      </Svg>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { finish: c } = useTheme();
  return (
    <View style={[{ borderWidth: 1, borderColor: c.bd, backgroundColor: c.cd, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 10 }, style]}>
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
          paddingVertical: big ? 12 : 6,
          paddingHorizontal: big ? 22 : 11,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      {metal ? <MetalBg /> : null}
      <Text style={{ color: metal ? "#120d06" : c.ink, fontFamily: FONT.strong, fontSize: big ? 14 : 11 }}>{label}</Text>
    </Pressable>
  );
}
