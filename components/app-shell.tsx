import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from "react-native-svg";
import { FONT } from "@/constants/fonts";
import { MetalBg } from "@/components/luxe";
import { Emblem } from "@/components/watch/emblem";
import { useTheme } from "@/lib/theme";

const ITEMS = [
  { href: "/", label: "Today" },
  { href: "/settings", label: "Settings" },
] as const;

function Icon({ kind, color }: { kind: "today" | "settings"; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {kind === "today" ? (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 7v5l3 2" />
        </>
      ) : (
        <>
          <Path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
          <Circle cx={16} cy={8} r={2} />
          <Circle cx={8} cy={16} r={2} />
        </>
      )}
    </Svg>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { finish: c } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: c.b0 }}>
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <RadialGradient id="bgr" cx="50" cy="-10" r="95" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={c.b1} />
            <Stop offset="1" stopColor={c.b0} />
          </RadialGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#bgr)" />
      </Svg>

      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Emblem size={38} />
          <Text style={[styles.brand, { color: c.m1 }]}>D-EAGLE</Text>
        </View>

        <View style={{ flex: 1, minHeight: 0 }}>{children}</View>

        <View style={[styles.dock, { borderColor: c.bd, backgroundColor: c.cd }]}>
          {ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Pressable
                key={item.href}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                onPress={() => router.navigate(item.href)}
                style={styles.dockItem}
              >
                {active ? <MetalBg radius={22} /> : null}
                <Icon kind={item.href === "/" ? "today" : "settings"} color={active ? "#120d06" : c.mut} />
                <Text style={[styles.dockLabel, { color: active ? "#120d06" : c.mut }]}>{item.label.toUpperCase()}</Text>
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, maxWidth: 980, width: "100%", alignSelf: "center" },
  brand: { fontFamily: FONT.displayBold, fontSize: 20, letterSpacing: 4.4 },
  dock: { flexDirection: "row", gap: 4, width: "92%", maxWidth: 460, alignSelf: "center", marginBottom: 8, marginTop: 6, padding: 6, borderWidth: 1, borderRadius: 28 },
  dockItem: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 8, borderRadius: 22, overflow: "hidden" },
  dockLabel: { fontFamily: FONT.strong, fontSize: 9, letterSpacing: 1.2 },
});
