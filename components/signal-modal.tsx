import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { radii } from "@/constants/radii";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

/**
 * INTEGRATION NOTE -- opened by tapping the streak/count in the sheet
 * header (see commitment-sheet.tsx's dayCount text). `keptCount` and
 * `totalCount` come from your existing weekly-snapshots data. `isPaid`
 * gates the real chart -- wire it to whatever paid-tier flag you add;
 * until then it should stay false so everyone sees the honest locked
 * state, matching the agreed mockup.
 */

export function SignalModal({
  visible,
  onClose,
  keptCount,
  totalCount,
  isPaid,
  onUpgrade,
}: {
  visible: boolean;
  onClose: () => void;
  keptCount: number;
  totalCount: number;
  isPaid: boolean;
  onUpgrade: () => void;
}) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>SIGNAL</Text>
            {!isPaid && (
              <View style={styles.paidTag}><Text style={{ color: "#EF9F27", fontSize: 10 }}>Paid</Text></View>
            )}
          </View>
          <Text style={[styles.summary, { color: colors.foreground }]}>
            You kept {keptCount} of {totalCount} this week
          </Text>

          {isPaid ? (
            <View style={styles.chartPlaceholder}>
              {/* Real chart component goes here once wired to weekly-snapshots data */}
            </View>
          ) : (
            <View style={[styles.lockedCard, { borderColor: colors.border }]}>
              <View style={styles.fakeBars}>
                <View style={[styles.bar, { height: 20 }]} />
                <View style={[styles.bar, { height: 40 }]} />
                <View style={[styles.bar, { height: 55 }]} />
                <View style={[styles.bar, { height: 30 }]} />
              </View>
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: spacing.xs }}>Full history and charts</Text>
                <Pressable onPress={onUpgrade} style={({ pressed }) => [styles.upgradeBtn, pressed && styles.pressed]}>
                  <Text style={{ color: colors.primary, fontSize: 12 }}>Upgrade</Text>
                </Pressable>
              </View>
            </View>
          )}

          <Pressable onPress={onClose} style={styles.close}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { ...typography.eyebrow },
  paidTag: { backgroundColor: "#3A2A0C", borderRadius: radii.chip, paddingVertical: 2, paddingHorizontal: spacing.sm },
  summary: { ...typography.subtitle, marginTop: spacing.sm, marginBottom: spacing.lg },
  chartPlaceholder: { minHeight: 140 },
  lockedCard: { borderWidth: 1, borderRadius: radii.card, padding: spacing.xl, alignItems: "center", position: "relative" },
  fakeBars: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm, height: 60, opacity: 0.35 },
  bar: { width: 14, backgroundColor: "#5DCAA5", borderRadius: 3 },
  lockOverlay: { position: "absolute", alignItems: "center", top: 0, bottom: 0, left: 0, right: 0, justifyContent: "center" },
  upgradeBtn: { marginTop: spacing.sm, borderWidth: 1, borderColor: "#5DCAA5", borderRadius: radii.card, paddingVertical: spacing.xs, paddingHorizontal: spacing.lg },
  pressed: { opacity: 0.72 },
  close: { alignSelf: "center", marginTop: spacing.lg, paddingVertical: spacing.sm },
});
