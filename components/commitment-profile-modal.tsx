import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { radii } from "@/constants/radii";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import type { Belief } from "@/lib/intelligence/beliefs";

/**
 * INTEGRATION NOTE -- open from the avatar on Home (paid-tier gate goes
 * around the `<Pressable onPress={() => setShowProfile(true)}>` that
 * opens this, not inside this file). Pass beliefs computed from real
 * local history via getCommitmentBeliefs() -- see lib/intelligence/beliefs.ts.
 * onCorrect should call correctBelief() and persist the returned history
 * back into local storage, then recompute beliefs.
 */

export function CommitmentProfileModal({
  visible,
  onClose,
  beliefs,
  onCorrect,
}: {
  visible: boolean;
  onClose: () => void;
  beliefs: Belief[];
  onCorrect: (category: string, wasAccurate: boolean) => void;
}) {
  const colors = useColors();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>COMMITMENT PROFILE</Text>
            <View style={styles.paidTag}><Text style={{ color: "#EF9F27", fontSize: 10 }}>Paid</Text></View>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>What Eagle thinks it knows</Text>

          {beliefs.length === 0 ? (
            <Text style={[styles.empty, { color: colors.muted }]}>
              Not enough history yet. Eagle needs a few more closed-out commitments before it forms a belief.
            </Text>
          ) : (
            beliefs.map((belief) => (
              <View key={belief.category} style={[styles.card, { borderColor: colors.border }]}>
                <Text style={[styles.explanation, { color: colors.foreground }]}>{belief.explanation}</Text>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => onCorrect(belief.category, true)}
                    style={({ pressed }) => [styles.confirm, pressed && styles.pressed]}
                  >
                    <Text style={{ color: colors.primary, fontSize: 13 }}>That&apos;s right</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onCorrect(belief.category, false)}
                    style={({ pressed }) => [styles.deny, { borderColor: colors.border }, pressed && styles.pressed]}
                  >
                    <Text style={{ color: colors.muted, fontSize: 13 }}>Not really</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}

          <Text style={[styles.footnote, { color: colors.muted }]}>
            Correcting a belief here outweighs any single missed or kept commitment.
          </Text>

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
  title: { ...typography.subtitle, fontWeight: "700", marginTop: spacing.sm, marginBottom: spacing.lg },
  empty: { ...typography.bodySmall, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: radii.card, padding: spacing.lg, marginBottom: spacing.md },
  explanation: { ...typography.bodySmall, lineHeight: 20 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  confirm: { flex: 1, backgroundColor: "#0F3A30", borderRadius: radii.card, paddingVertical: spacing.sm, alignItems: "center" },
  deny: { flex: 1, borderWidth: 1, borderRadius: radii.card, paddingVertical: spacing.sm, alignItems: "center" },
  pressed: { opacity: 0.72 },
  footnote: { ...typography.caption, marginTop: spacing.sm, lineHeight: 16 },
  close: { alignSelf: "center", marginTop: spacing.lg, paddingVertical: spacing.sm },
});
