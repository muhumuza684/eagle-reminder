import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { FONT } from "@/constants/fonts";
import { MetalBg } from "@/components/luxe";
import { Overlays } from "@/components/overlays";
import { Emblem } from "@/components/watch/emblem";
import { useApp } from "@/lib/app-state";
import { useTheme } from "@/lib/theme";

type Kind = "today" | "reminders" | "settings";
const ITEMS: { href: "/" | "/reminders" | "/settings"; label: string; kind: Kind }[] = [
  { href: "/", label: "Today", kind: "today" },
  { href: "/reminders", label: "Reminders", kind: "reminders" },
  { href: "/settings", label: "Settings", kind: "settings" },
];

function Icon({ kind, color }: { kind: Kind; color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {kind === "today" ? (
        <>
          <Circle cx={12} cy={12} r={9} />
          <Path d="M12 7v5l3 2" />
        </>
      ) : kind === "reminders" ? (
        <Path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
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
  const { reminders } = useApp();

  const backdrop = { backgroundImage: `radial-gradient(120% 80% at 50% -10%, ${c.b1}, ${c.b0} 62%)` } as unknown as ViewStyle;

  return (
    <View style={[{ flex: 1, backgroundColor: c.b0 }, backdrop]}>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Emblem size={38} />
          <Text style={[styles.brand, { color: c.m1 }]}>D-EAGLE</Text>
        </View>

        <View style={{ flex: 1, minHeight: 0 }}>{children}</View>

        <View style={[styles.dock, { borderColor: c.bd, backgroundColor: c.cd }]}>
          {ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const count = item.kind === "reminders" ? reminders.open.length : 0;
            return (
              <Pressable key={item.href} accessibilityRole="button" accessibilityLabel={item.label} onPress={() => router.navigate(item.href)} style={styles.dockItem}>
                {active ? <MetalBg radius={22} /> : null}
                <Icon kind={item.kind} color={active ? "#120d06" : c.mut} />
                <Text style={[styles.dockLabel, { color: active ? "#120d06" : c.mut }]}>{item.label.toUpperCase()}</Text>
                {count > 0 ? (
                  <View style={[styles.badge, { backgroundColor: c.gem }]}>
                    <Text style={styles.badgeText}>{count}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </SafeAreaView>
      <Overlays />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 4, maxWidth: 1320, width: "100%", alignSelf: "center" },
  brand: { fontFamily: FONT.displayBold, fontSize: 20, letterSpacing: 4.4 },
  dock: { flexDirection: "row", gap: 4, width: "92%", maxWidth: 520, alignSelf: "center", marginBottom: 8, marginTop: 6, padding: 6, borderWidth: 1, borderRadius: 28 },
  dockItem: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 8, borderRadius: 22, overflow: "hidden" },
  dockLabel: { fontFamily: FONT.strong, fontSize: 9, letterSpacing: 1.2 },
  badge: { position: "absolute", top: 2, right: "22%", minWidth: 17, height: 17, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "#fff", fontFamily: FONT.strong, fontSize: 10 },
});
