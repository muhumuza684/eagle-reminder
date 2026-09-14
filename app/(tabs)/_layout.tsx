import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform, useWindowDimensions } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { spacing } from "@/constants/spacing";

// Desktop/wide breakpoint. Below this, bottom tabs (mobile pattern).
// At or above it, the same tab bar becomes a left sidebar — same
// navigator and routes, just restyled, so no navigation logic forks.
const SIDEBAR_BREAKPOINT = 900;

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSidebar = width >= SIDEBAR_BREAKPOINT;
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarStyle: isSidebar
          ? {
              flexDirection: "column",
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: 220,
              height: "100%",
              paddingTop: spacing.xxxl,
              paddingHorizontal: spacing.sm,
              backgroundColor: colors.surface,
              borderTopWidth: 0,
              borderRightWidth: 0.5,
              borderRightColor: colors.border,
            }
          : {
              paddingTop: 8,
              paddingBottom: bottomPadding,
              height: 56 + bottomPadding,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
              borderTopWidth: 0.5,
            },
        tabBarItemStyle: isSidebar
          ? { flexDirection: "row", justifyContent: "flex-start", height: 46, borderRadius: 12, marginBottom: 2, paddingHorizontal: spacing.md }
          : undefined,
        tabBarLabelStyle: isSidebar ? { fontSize: 13, fontWeight: "600", marginLeft: spacing.sm } : { fontSize: 11 },
        // On the sidebar, content needs a left inset equal to the rail's width
        // so screens don't render underneath it (tabBarStyle is `position: absolute`).
        sceneStyle: isSidebar ? { marginLeft: 220 } : undefined,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Today", tabBarIcon: ({ color }) => <IconSymbol size={22} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="review" options={{ title: "Review", tabBarIcon: ({ color }) => <IconSymbol size={22} name="moon.fill" color={color} /> }} />
      <Tabs.Screen name="dashboard" options={{ title: "Signal", tabBarIcon: ({ color }) => <IconSymbol size={22} name="chart.bar.fill" color={color} /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: ({ color }) => <IconSymbol size={22} name="gearshape.fill" color={color} /> }} />
    </Tabs>
  );
}