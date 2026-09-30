import { useEffect, useState } from "react";
import { View, Text, Pressable, Switch, StyleSheet } from "react-native";
import DateTimeField from "@/components/date-time-field";
import { useColors } from "@/hooks/use-colors";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { getLocalPreferences, setLocalPreferences } from "@/lib/preferences";
import { requestLocalNotificationPermission } from "@/lib/native-services";

export default function SettingsScreen() {
  const colors = useColors();

  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(7);
  const [picker, setPicker] = useState<"quietStart" | "quietEnd" | null>(null);

  useEffect(() => {
    getLocalPreferences().then((prefs) => {
      setRemindersEnabled(prefs.notificationsEnabled);
      setQuietStart(prefs.quietHoursStart);
      setQuietEnd(prefs.quietHoursEnd);
    });
  }, []);

  const toggleReminders = async (value: boolean) => {
    setRemindersEnabled(value);

    if (value) {
      await requestLocalNotificationPermission();
    }

    const next = await setLocalPreferences({
      notificationsEnabled: value,
    });

    setQuietStart(next.quietHoursStart);
    setQuietEnd(next.quietHoursEnd);
  };

  const applyQuietHour = async (hour: number) => {
    if (picker === "quietStart") {
      setQuietStart(hour);
      await setLocalPreferences({ quietHoursStart: hour });
    }

    if (picker === "quietEnd") {
      setQuietEnd(hour);
      await setLocalPreferences({ quietHoursEnd: hour });
    }

    setPicker(null);
  };

  const hourLabel = (hour: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const display = hour % 12 === 0 ? 12 : hour % 12;
    return `${display}:00 ${period}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>SETTINGS</Text>

      <Text style={[styles.title, { color: colors.foreground }]}>
        Keep reminders simple
      </Text>

      <View style={[styles.row, { borderColor: colors.border }]}>
        <View style={styles.copy}>
          <Text style={[styles.rowText, { color: colors.foreground }]}>
            Reminders
          </Text>
          <Text style={[styles.rowHint, { color: colors.muted }]}>
            Allow D-Eagle to remind you at the time you choose.
          </Text>
        </View>

        <Switch
          value={remindersEnabled}
          onValueChange={toggleReminders}
        />
      </View>

      <Pressable
        onPress={() => setPicker("quietStart")}
        style={[styles.row, { borderColor: colors.border }]}
      >
        <View style={styles.copy}>
          <Text style={[styles.rowText, { color: colors.foreground }]}>
            Quiet hours
          </Text>
          <Text style={[styles.rowHint, { color: colors.muted }]}>
            No reminder alerts during this window.
          </Text>
        </View>

        <Text style={[styles.rowValue, { color: colors.muted }]}>
          {hourLabel(quietStart)} – {hourLabel(quietEnd)}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => setPicker("quietEnd")}
        style={[styles.row, { borderColor: colors.border }]}
      >
        <Text style={[styles.rowText, { color: colors.foreground }]}>
          Quiet hours end
        </Text>

        <Text style={[styles.rowValue, { color: colors.muted }]}>
          {hourLabel(quietEnd)}
        </Text>
      </Pressable>

      {picker && (
        <DateTimeField
          value={
            new Date(
              2000,
              0,
              1,
              picker === "quietStart" ? quietStart : quietEnd,
              0,
            )
          }
          mode="time"
          onChange={(date) => {
            if (date) {
              applyQuietHour(date.getHours());
            } else {
              setPicker(null);
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  eyebrow: {
    ...typography.eyebrow,
  },
  title: {
    ...typography.display,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.lg,
  },
  copy: {
    flex: 1,
  },
  rowText: {
    ...typography.bodySmall,
    fontWeight: "700",
  },
  rowHint: {
    ...typography.caption,
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  rowValue: {
    ...typography.bodySmall,
    textAlign: "right",
  },
});