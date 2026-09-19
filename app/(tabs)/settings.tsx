import { useState, useEffect } from "react";
import { View, Text, Pressable, Switch, StyleSheet, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/use-colors";
import { radii } from "@/constants/radii";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";
import { getLocalPreferences, setLocalPreferences } from "@/lib/preferences";
import { exportLocalData, importLocalData } from "@/lib/local-data";


/**
 * INTEGRATION NOTE -- this is a clean rewrite to the Tier 19a spec (four
 * controls + backup), built from everything captured about the original
 * settings.tsx across this conversation: the picker pattern for
 * briefing/review hours, exportBackup/importBackup with the Tier 12
 * inline-error pattern, and the syncNote copy. It does NOT include
 * anything from the original file I never saw in full (e.g. any trpc
 * cloud-preference sync hook that may exist). Diff this against your
 * real settings.tsx before replacing it -- keep any cloud-sync call your
 * version has that this one is missing, rather than dropping it.
 *
 * Removed per Tier 19a: Timezone, Language, Meeting countdown chime and
 * Five-minute meeting warning as separate toggles (folded into
 * Reminders), Eagle voice alerts (moved to a paid row, not shown here --
 * add it back gated once paid-tier logic exists).
 */

export default function SettingsScreen() {
  const colors = useColors();
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState(22);
  const [quietEnd, setQuietEnd] = useState(7);
  const [briefingHour, setBriefingHour] = useState(8);
  const [reviewHour, setReviewHour] = useState(22);
  const [picker, setPicker] = useState<"briefing" | "review" | "quietStart" | "quietEnd" | null>(null);
  const [dataError, setDataError] = useState("");
  const [reminderFrequency, setReminderFrequency] = useState<1 | 2 | 3>(1);
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState(true);

  useEffect(() => {
    getLocalPreferences().then((prefs) => {
      setReminderFrequency(prefs.reminderFrequency);
      setVoiceAlertsEnabled(prefs.voiceEnabled);
    });
  }, []);

  const toggleReminders = async (value: boolean) => {
    setRemindersEnabled(value);
    await setLocalPreferences({ notificationsEnabled: value });
  };

  const setFrequency = async (value: 1 | 2 | 3) => {
    setReminderFrequency(value);
    await setLocalPreferences({ reminderFrequency: value });
  };

  const toggleVoiceAlerts = async (value: boolean) => {
    setVoiceAlertsEnabled(value);
    await setLocalPreferences({ voiceEnabled: value });
  };

  const applyPickerHour = async (hour: number) => {
    if (picker === "briefing") { setBriefingHour(hour); await setLocalPreferences({ briefingHour: hour }); }
    if (picker === "review") { setReviewHour(hour); await setLocalPreferences({ reviewHour: hour }); }
    if (picker === "quietStart") { setQuietStart(hour); await setLocalPreferences({ quietHoursStart: hour }); }
    if (picker === "quietEnd") { setQuietEnd(hour); await setLocalPreferences({ quietHoursEnd: hour }); }
    setPicker(null);
  };

  const exportBackup = async () => {
    try {
      await exportLocalData();
    } catch {
      setDataError("Could not create the local backup.");
      setTimeout(() => setDataError(""), 4200);
    }
  };

  const importBackup = async () => {
    if (Platform.OS !== "web") {
      setDataError("Import from a file isn't available on this device yet -- use the web version to restore a backup.");
      setTimeout(() => setDataError(""), 4200);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const json = await file.text();
        await importLocalData(json);
      } catch {
        setDataError("That file is not a valid D-Eagle Hub backup.");
        setTimeout(() => setDataError(""), 4200);
      }
    };
    input.click();
  };

  const hourLabel = (h: number) => {
    const period = h >= 12 ? "PM" : "AM";
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:00 ${period}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>SETTINGS</Text>
      <Text style={[styles.title, { color: colors.foreground }]}>Make Eagle fit you</Text>

      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.rowText, { color: colors.foreground }]}>Reminders</Text>
        <Switch value={remindersEnabled} onValueChange={toggleReminders} />
      </View>

      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.rowText, { color: colors.foreground }]}>Reminder frequency</Text>
        <View style={styles.freqGroup}>
          {[1, 2, 3].map((n) => (
            <Pressable key={n} onPress={() => setFrequency(n as 1 | 2 | 3)} style={[styles.freqChip, { borderColor: colors.border, backgroundColor: reminderFrequency === n ? colors.primary : "transparent" }]}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: reminderFrequency === n ? "#FFFFFF" : colors.foreground }}>{n}x</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.rowText, { color: colors.foreground }]}>Voice alerts</Text>
        <Switch value={voiceAlertsEnabled} onValueChange={toggleVoiceAlerts} />
      </View>

      <Pressable onPress={() => setPicker("quietStart")} style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.rowText, { color: colors.foreground }]}>Quiet hours</Text>
        <Text style={[styles.rowValue, { color: colors.muted }]}>{hourLabel(quietStart)} - {hourLabel(quietEnd)}</Text>
      </Pressable>

      <Pressable onPress={() => setPicker("briefing")} style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.rowText, { color: colors.foreground }]}>Morning briefing</Text>
        <Text style={[styles.rowValue, { color: colors.muted }]}>{hourLabel(briefingHour)}</Text>
      </Pressable>

      <Pressable onPress={() => setPicker("review")} style={[styles.row, { borderColor: colors.border }]}>
        <Text style={[styles.rowText, { color: colors.foreground }]}>Nightly review</Text>
        <Text style={[styles.rowValue, { color: colors.muted }]}>{hourLabel(reviewHour)}</Text>
      </Pressable>

      <Pressable
        onPress={exportBackup}
        style={({ pressed }) => [styles.card, { borderColor: colors.border }, pressed && styles.pressed]}
      >
        <Ionicons name="download-outline" size={18} color={colors.primary} />
        <Text style={[styles.cardText, { color: colors.foreground }]}>Export local backup</Text>
      </Pressable>

      <Pressable
        onPress={importBackup}
        style={({ pressed }) => [styles.card, { borderColor: colors.border }, pressed && styles.pressed]}
      >
        <Ionicons name="cloud-upload-outline" size={18} color={colors.primary} />
        <Text style={[styles.cardText, { color: colors.foreground }]}>Import local backup</Text>
      </Pressable>

      <Text style={[styles.syncNote, { color: colors.muted }]}>
        Your data is stored locally on this device. Export a backup before changing devices or clearing browser storage.
      </Text>
      {dataError ? <Text style={[styles.syncNote, { color: "#C94F3B", marginTop: 0 }]}>{dataError}</Text> : null}


      {picker && (
        <DateTimePicker
          value={new Date(2000, 0, 1, picker === "briefing" ? briefingHour : picker === "review" ? reviewHour : picker === "quietStart" ? quietStart : quietEnd, 0)}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_event, date) => { if (date) applyPickerHour(date.getHours()); else setPicker(null); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing.xxl, paddingHorizontal: spacing.lg },
  eyebrow: { ...typography.eyebrow },
  title: { ...typography.display, marginTop: spacing.xs, marginBottom: spacing.xl },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.md, borderTopWidth: 1 },
  rowText: { ...typography.bodySmall },
  rowValue: { ...typography.bodySmall },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1, borderRadius: radii.card, padding: spacing.lg, marginTop: spacing.md },
  cardText: { ...typography.bodySmall },
  pressed: { opacity: 0.72 },
  syncNote: { ...typography.caption, marginTop: spacing.lg },
  freqGroup: { flexDirection: "row", gap: spacing.xs },
  freqChip: { borderWidth: 1, borderRadius: radii.chip, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
});





