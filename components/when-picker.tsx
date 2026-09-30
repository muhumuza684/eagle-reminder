import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useColors } from "@/hooks/use-colors";
import { radii } from "@/constants/radii";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

export function formatHHMM(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function defaultWhen(): Date {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const QUICK = [
  { label: "Today", days: 0 },
  { label: "Tomorrow", days: 1 },
  { label: "Next week", days: 7 },
];

type WhenPickerProps = {
  value: Date | null;
  onChange: (next: Date | null) => void;
};

function Stepper({ icon, label, onPress, border, color }: { icon: "add" | "remove"; label: string; onPress: () => void; border: string; color: string }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={6} style={({ pressed }) => [styles.stepper, { borderColor: border }, pressed && { opacity: 0.6 }]}>
      <Ionicons name={icon} size={18} color={color} />
    </Pressable>
  );
}

export default function WhenPicker({ value, onChange }: WhenPickerProps) {
  const colors = useColors();
  const base = value ?? defaultWhen();
  const [month, setMonth] = useState(() => new Date(base.getFullYear(), base.getMonth(), 1));

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hour24 = base.getHours();
  const minute = base.getMinutes();
  const isPM = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  const setDay = (day: Date) => onChange(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour24, minute, 0, 0));
  const setTime = (hours: number, minutes: number) => onChange(new Date(base.getFullYear(), base.getMonth(), base.getDate(), hours, minutes, 0, 0));
  const stepHour = (delta: number) => {
    const next12 = ((hour12 - 1 + delta + 12) % 12) + 1;
    setTime((next12 % 12) + (isPM ? 12 : 0), minute);
  };
  const stepMinute = (delta: number) => setTime(hour24, (Math.round(minute / 5) * 5 + delta + 60) % 60);
  const setMeridiem = (pm: boolean) => setTime(pm ? (hour24 < 12 ? hour24 + 12 : hour24) : (hour24 >= 12 ? hour24 - 12 : hour24), minute);

  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(new Date(month.getFullYear(), month.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const canGoBack = month.getFullYear() * 12 + month.getMonth() > todayStart.getFullYear() * 12 + todayStart.getMonth();
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const summary = value
    ? `${value.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at ${value.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : "Not chosen - Eagle will read the time from your words";

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.summaryRow}>
        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
        <Text style={[styles.summary, { color: value ? colors.foreground : colors.muted }]} numberOfLines={2}>{summary}</Text>
        {value ? (
          <Pressable onPress={() => onChange(null)} accessibilityLabel="Clear date and time" hitSlop={8}>
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.chipRow}>
        {QUICK.map((quick) => {
          const target = new Date();
          target.setDate(target.getDate() + quick.days);
          const active = !!value && sameDay(value, target);
          return (
            <Pressable
              key={quick.label}
              onPress={() => { setDay(target); setMonth(new Date(target.getFullYear(), target.getMonth(), 1)); }}
              style={[styles.chip, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : "transparent" }]}
            >
              <Text style={[styles.chipText, { color: active ? "#FFFFFF" : colors.foreground }]}>{quick.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.monthRow}>
        <Pressable disabled={!canGoBack} onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} accessibilityLabel="Previous month" hitSlop={10} style={{ opacity: canGoBack ? 1 : 0.25 }}>
          <Ionicons name="chevron-back" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.foreground }]}>{monthLabel}</Text>
        <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} accessibilityLabel="Next month" hitSlop={10}>
          <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.gridRow}>
        {WEEKDAYS.map((label, index) => <Text key={index} style={[styles.weekday, { color: colors.muted }]}>{label}</Text>)}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.gridRow}>
          {row.map((day, colIndex) => {
            const disabled = !day || day.getTime() < todayStart.getTime();
            const selected = !!day && !!value && sameDay(day, value);
            const isToday = !!day && sameDay(day, todayStart);
            return (
              <Pressable key={colIndex} disabled={disabled} onPress={() => { if (day) setDay(day); }} accessibilityLabel={day ? day.toDateString() : undefined} style={styles.cell}>
                {day ? (
                  <View style={[styles.dayCircle, selected && { backgroundColor: colors.primary }, !selected && isToday && { borderWidth: 1, borderColor: colors.primary }]}>
                    <Text style={[styles.dayText, { color: selected ? "#FFFFFF" : colors.foreground, opacity: disabled ? 0.35 : 1 }]}>{day.getDate()}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={[styles.timeRow, { borderTopColor: colors.border }]}>
        <Stepper icon="remove" label="Earlier hour" onPress={() => stepHour(-1)} border={colors.border} color={colors.foreground} />
        <Text style={[styles.timeDigits, { color: colors.foreground }]}>{hour12}</Text>
        <Stepper icon="add" label="Later hour" onPress={() => stepHour(1)} border={colors.border} color={colors.foreground} />
        <Text style={[styles.timeDigits, { color: colors.muted }]}>:</Text>
        <Stepper icon="remove" label="Five minutes earlier" onPress={() => stepMinute(-5)} border={colors.border} color={colors.foreground} />
        <Text style={[styles.timeDigits, { color: colors.foreground }]}>{String(minute).padStart(2, "0")}</Text>
        <Stepper icon="add" label="Five minutes later" onPress={() => stepMinute(5)} border={colors.border} color={colors.foreground} />
        <View style={[styles.meridiem, { borderColor: colors.border }]}>
          <Pressable onPress={() => setMeridiem(false)} style={[styles.meridiemHalf, !isPM && { backgroundColor: colors.primary }]}>
            <Text style={[styles.meridiemText, { color: !isPM ? "#FFFFFF" : colors.foreground }]}>AM</Text>
          </Pressable>
          <Pressable onPress={() => setMeridiem(true)} style={[styles.meridiemHalf, isPM && { backgroundColor: colors.primary }]}>
            <Text style={[styles.meridiemText, { color: isPM ? "#FFFFFF" : colors.foreground }]}>PM</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.card, padding: spacing.md, marginTop: spacing.md },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  summary: { flex: 1, ...typography.bodySmall, fontWeight: "700" },
  chipRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  chip: { borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipText: { ...typography.caption, fontWeight: "700" },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  monthLabel: { ...typography.body, fontWeight: "800" },
  gridRow: { flexDirection: "row" },
  weekday: { flex: 1, textAlign: "center", ...typography.caption, fontWeight: "700", paddingVertical: spacing.xs },
  cell: { flex: 1, height: 40, alignItems: "center", justifyContent: "center" },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dayText: { ...typography.bodySmall, fontWeight: "700" },
  timeRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1 },
  stepper: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  timeDigits: { fontSize: 22, fontWeight: "800", minWidth: 28, textAlign: "center" },
  meridiem: { flexDirection: "row", borderWidth: 1, borderRadius: radii.chip, overflow: "hidden", marginLeft: spacing.sm },
  meridiemHalf: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  meridiemText: { ...typography.caption, fontWeight: "800" },
});