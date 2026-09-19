import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { radii } from "@/constants/radii";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

/**
 * INTEGRATION NOTE -- drop into the top of your rebuilt Home (index.tsx)
 * in place of the old "Eagle has a read on this one" banner. Pass the
 * SAME `atRisk` commitment and `atRiskPrediction` you already compute
 * (see the Tier 14 patch -- the useMemo block calling predictMissRisk is
 * unchanged, just render this component instead of the old banner JSX).
 */

type NextCommitment = {
  title: string;
  timeStart: string; // "HH:MM"
  riskExplanation?: string | null;
};

export function CountdownHero({
  next,
  onDone,
  onSnooze,
}: {
  next: NextCommitment | null;
  onDone: () => void;
  onSnooze: () => void;
}) {
  const colors = useColors();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  if (!next) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.label, { color: colors.muted }]}>Nothing left today</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>You&apos;re clear.</Text>
      </View>
    );
  }

  const [h, m] = next.timeStart.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  const isPast = diffMs < 0;
  const absMin = Math.max(0, Math.round(Math.abs(diffMs) / 60000));
  const hh = Math.floor(absMin / 60);
  const mm = absMin % 60;
  const clockText = `${hh}:${String(mm).padStart(2, "0")}`;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.muted }]}>{isPast ? "Overdue by" : "Next up"}</Text>
      <Text style={[styles.countdown, { color: colors.foreground }]}>{clockText}</Text>
      <Text style={[styles.unit, { color: colors.muted }]}>{isPast ? "minutes ago" : "hours left"}</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>{next.title}</Text>
      {next.riskExplanation ? (
        <View style={[styles.riskPill, { backgroundColor: "#3A2A0C" }]}>
          <Text style={{ color: "#EF9F27", fontSize: 11 }}>{next.riskExplanation}</Text>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable onPress={onDone} style={({ pressed }) => [styles.btn, { borderColor: colors.border }, pressed && styles.pressed]}>
          <Text style={{ color: colors.foreground, fontSize: 12 }}>Done</Text>
        </Pressable>
        <Pressable onPress={onSnooze} style={({ pressed }) => [styles.btn, { borderColor: colors.border }, pressed && styles.pressed]}>
          <Text style={{ color: colors.foreground, fontSize: 12 }}>Snooze</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", paddingVertical: spacing.xxl },
  label: { ...typography.caption },
  countdown: { fontSize: 38, fontWeight: "500", letterSpacing: -1, marginTop: spacing.sm },
  unit: { ...typography.caption, marginTop: spacing.xs },
  title: { ...typography.subtitle, fontWeight: "700", marginTop: spacing.lg },
  riskPill: { borderRadius: radii.chip, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, marginTop: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  btn: { borderWidth: 1, borderRadius: radii.card, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
  pressed: { opacity: 0.72 },
});
