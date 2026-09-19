import { View, Text, Pressable, StyleSheet, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { radii } from "@/constants/radii";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

// INTEGRATION NOTE: if your app already has app/about.tsx (app/_layout.tsx
// registers a Stack.Screen named "about"), diff this against the existing
// file rather than overwriting blind -- merge in whatever this one is
// missing (e.g. a real onboarding-replay hook) instead of losing it.

export default function AboutScreen({ onReplayIntro }: { onReplayIntro?: () => void }) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surface }]}>
        <Ionicons name="leaf-outline" size={28} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>D-Eagle Hub</Text>
      <Text style={[styles.version, { color: colors.muted }]}>Version 1.0.0</Text>

      <Text style={[styles.blurb, { color: colors.muted }]}>
        Eagle holds your daily commitments and learns which ones you tend to break, so it can nudge you before they slip.
      </Text>

      <Pressable
        onPress={onReplayIntro}
        style={({ pressed }) => [styles.row, { borderColor: colors.border }, pressed && styles.pressed]}
      >
        <Text style={[styles.rowText, { color: colors.foreground }]}>Show the intro again</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Pressable>

      <Pressable
        onPress={() => Linking.openURL("mailto:hello@brytmatech.com")}
        style={({ pressed }) => [styles.row, { borderColor: colors.border }, pressed && styles.pressed]}
      >
        <Text style={[styles.rowText, { color: colors.foreground }]}>Contact</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Pressable>

      <View style={styles.credit}>
        <Text style={[styles.creditText, { color: colors.muted }]}>Built by AGU</Text>
        <Text style={[styles.creditText, { color: colors.muted }]}>Bryt Ma Tech UG</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", paddingTop: spacing.huge, paddingHorizontal: spacing.xl },
  iconWrap: { width: 52, height: 52, borderRadius: radii.card, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  title: { ...typography.subtitle, fontWeight: "700" },
  version: { ...typography.caption, marginTop: spacing.xs },
  blurb: { ...typography.bodySmall, textAlign: "left", alignSelf: "stretch", marginVertical: spacing.xl, lineHeight: 20 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", alignSelf: "stretch", paddingVertical: spacing.md, borderTopWidth: 1 },
  rowText: { ...typography.bodySmall },
  pressed: { opacity: 0.72 },
  credit: { marginTop: spacing.xxl, alignItems: "center" },
  creditText: { ...typography.caption },
});
