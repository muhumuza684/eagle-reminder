import { View, Text, Pressable, StyleSheet } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { radii } from "@/constants/radii";
import { spacing } from "@/constants/spacing";

/**
 * INTEGRATION NOTE -- replaces any date-range/day-filter UI on Home.
 * `selectedDateKey` and `onSelectDate` should read/write the same
 * scheduledDate filter your `active` useMemo already keys off (the one
 * fixed in the date-shift bug patch). Builds keys with local date parts,
 * not toISOString(), to avoid that exact bug recurring here.
 */

const DAY_LABELS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DayStrip({
  selectedDateKey,
  onSelectDate,
}: {
  selectedDateKey: string;
  onSelectDate: (dateKey: string) => void;
}) {
  const colors = useColors();
  const today = new Date();
  const monday = new Date(today);
  const dow = (today.getDay() + 6) % 7; // 0 = Monday
  monday.setDate(today.getDate() - dow);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { key: localDateKey(d), label: DAY_LABELS[i] };
  });

  return (
    <View style={styles.row}>
      {days.map((day) => {
        const selected = day.key === selectedDateKey;
        return (
          <Pressable
            key={day.key}
            onPress={() => onSelectDate(day.key)}
            style={[
              styles.cell,
              { borderRadius: radii.chip },
              selected && { backgroundColor: "#0F3A30" },
            ]}
          >
            <Text style={{ fontSize: 11, color: selected ? colors.primary : colors.muted }}>{day.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 4, paddingHorizontal: spacing.sm, paddingBottom: spacing.md },
  cell: { flex: 1, alignItems: "center", paddingVertical: spacing.sm },
});
