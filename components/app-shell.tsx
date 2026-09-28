import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";

import { MAIN_NAV_ITEMS } from "@/constants/navigation";
import { spacing } from "@/constants/spacing";
import { radii } from "@/constants/radii";
import { typography } from "@/constants/typography";
import { useColors } from "@/hooks/use-colors";

const DESKTOP_BREAKPOINT = 860;
const SIDEBAR_WIDTH = 240;

function activeKey(pathname: string) {
  if (pathname.startsWith("/dashboard")) return "progress";
  if (pathname.startsWith("/review")) return "review";
  if (pathname.startsWith("/settings")) return "settings";
  return "today";
}

function Brand() {
  const colors = useColors();

  return (
    <View style={styles.brand}>
      <View
        style={[
          styles.brandMark,
          { backgroundColor: colors.navy },
        ]}
      >
        <Text
          style={[
            styles.brandMarkText,
            { color: colors.paper },
          ]}
        >
          D
        </Text>
      </View>

      <View>
        <Text
          style={[
            typography.eyebrow,
            { color: colors.foreground },
          ]}
        >
          D-EAGLE
        </Text>

        <Text
          style={[
            typography.caption,
            { color: colors.muted },
          ]}
        >
          clarity, held
        </Text>
      </View>
    </View>
  );
}

function Avatar() {
  const colors = useColors();

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Profile"
      style={[
        styles.avatar,
        { backgroundColor: colors.navy },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          { color: colors.paper },
        ]}
      >
        A
      </Text>
    </View>
  );
}

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const colors = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= DESKTOP_BREAKPOINT;
  const selectedKey = activeKey(pathname);

  const go = (href: (typeof MAIN_NAV_ITEMS)[number]["href"]) =>
    router.push(href);

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={[
        styles.root,
        { backgroundColor: colors.background },
      ]}
    >
      {desktop ? (
        <View style={styles.desktopShell}>
          <View
            style={[
              styles.sidebar,
              {
                backgroundColor: colors.paper,
                borderRightColor: colors.border,
              },
            ]}
          >
            <Brand />

            <View style={styles.nav}>
              {MAIN_NAV_ITEMS.map((item) => {
                const selected = selectedKey === item.key;

                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => go(item.href)}
                    style={({ pressed }) => [
                      styles.navItem,
                      selected && {
                        backgroundColor: colors.accentSoft,
                      },
                      pressed && { opacity: 0.75 },
                    ]}
                  >
                    <Ionicons
                      name={
                        item.key === "today"
                          ? "today-outline"
                          : item.key === "progress"
                            ? "pulse-outline"
                            : item.key === "review"
                              ? "checkmark-circle-outline"
                              : "settings-outline"
                      }
                      size={19}
                      color={
                        selected
                          ? colors.navy
                          : colors.muted
                      }
                    />

                    <Text
                      style={[
                        typography.nav,
                        {
                          color: selected
                            ? colors.navy
                            : colors.inkSoft,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.bottom}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Capture"
                onPress={() => go("/")}
                style={({ pressed }) => [
                  styles.capture,
                  { backgroundColor: colors.coral },
                  pressed && { opacity: 0.82 },
                ]}
              >
                <Ionicons
                  name="add"
                  size={19}
                  color={colors.white}
                />
                <Text
                  style={[
                    typography.nav,
                    { color: colors.white },
                  ]}
                >
                  Capture
                </Text>
              </Pressable>

              <View
                style={[
                  styles.footer,
                  { borderTopColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: colors.muted },
                  ]}
                >
                  Private by default
                </Text>
                <Avatar />
              </View>
            </View>
          </View>

          <View style={styles.desktopContent}>
            <View
              style={[
                styles.topbar,
                { borderBottomColor: colors.border },
              ]}
            >
              <Text
                style={[
                  typography.caption,
                  { color: colors.muted },
                ]}
              >
                D-EAGLE HUB
              </Text>
              <Avatar />
            </View>

            <View style={styles.page}>
              {children}
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.mobile}>
          <View
            style={[
              styles.mobileTop,
              {
                backgroundColor: colors.paper,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Brand />
            <Avatar />
          </View>

          <View style={styles.page}>
            {children}
          </View>

          <View
            style={[
              styles.mobileNav,
              {
                backgroundColor: colors.paper,
                borderTopColor: colors.border,
              },
            ]}
          >
            {MAIN_NAV_ITEMS.map((item) => {
              const selected = selectedKey === item.key;

              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => go(item.href)}
                  style={styles.mobileItem}
                >
                  <Ionicons
                    name={
                      item.key === "today"
                        ? "today-outline"
                        : item.key === "progress"
                          ? "pulse-outline"
                          : item.key === "review"
                            ? "checkmark-circle-outline"
                            : "settings-outline"
                    }
                    size={21}
                    color={
                      selected
                        ? colors.navy
                        : colors.muted
                    }
                  />

                  <Text
                    style={[
                      typography.caption,
                      {
                        color: selected
                          ? colors.navy
                          : colors.muted,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },

  desktopShell: {
    flex: 1,
    flexDirection: "row",
  },

  sidebar: {
    width: SIDEBAR_WIDTH,
    borderRightWidth: 1,
    padding: spacing.lg,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  brandMark: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },

  brandMarkText: {
    fontSize: 18,
    fontWeight: "800",
  },

  nav: {
    marginTop: spacing.xxl,
    gap: spacing.xs,
  },

  navItem: {
    minHeight: 48,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  bottom: {
    flex: 1,
    justifyContent: "flex-end",
    gap: spacing.lg,
  },

  capture: {
    minHeight: 48,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },

  footer: {
    borderTopWidth: 1,
    paddingTop: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 14,
    fontWeight: "800",
  },

  desktopContent: {
    flex: 1,
  },

  topbar: {
    height: 64,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  page: {
    flex: 1,
  },

  mobile: {
    flex: 1,
  },

  mobileTop: {
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  mobileNav: {
    minHeight: 68,
    borderTopWidth: 1,
    flexDirection: "row",
  },

  mobileItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
});
