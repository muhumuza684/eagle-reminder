// MERGED — this is c_next_sequence's settings.tsx essentially as-is. Both
// patches implemented the same "sync preferences server-side" requirement
// independently (a genuine duplicate here, not complementary halves like
// critical-cascade), and this one was chosen because it's already wired to
// lib/preferences.ts — the module MERGE-NOTES.md picked as canonical (it
// persists to AsyncStorage and mirrors the legacy per-key storage that
// index.tsx/dashboard.tsx already read, which section7's equivalent
// lib/user-preferences.ts never did). No changes needed beyond that pick.

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { startOAuthLogin } from "@/constants/oauth";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from "react-native";
import AsyncStorage from "@/lib/secure-storage";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { scheduleDailyRituals } from "@/lib/native-services";
import { trpc } from "@/lib/trpc";
import { DEFAULT_PREFERENCES, EaglePreferences, getLocalPreferences, mergePreferences, setLocalPreferences } from "@/lib/preferences";
import { exportLocalData, importLocalData } from "@/lib/local-data";

export default function SettingsScreen() {
  const colors = useColors();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const cloudPreferences = trpc.preferences.get.useQuery(undefined, { enabled: isAuthenticated });
  const upsertPreferences = trpc.preferences.upsert.useMutation();
  const [prefs, setPrefs] = useState<EaglePreferences>(DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);
  const [picker, setPicker] = useState<"briefing" | "review" | null>(null);

  useEffect(() => { getLocalPreferences().then((local) => { setPrefs(local); setHydrated(true); }); }, []);

  const savePrefs = async (patch: Partial<EaglePreferences>) => {
    const next = await setLocalPreferences(patch);
    setPrefs(next);
    // Local-first mode: preferences stay on this device.
    return next;
  };

  const saveTimes = async (nextBriefing: number, nextReview: number) => { await savePrefs({ briefingHour: nextBriefing, reviewHour: nextReview }); await scheduleDailyRituals(nextBriefing, nextReview); };

  const exportBackup = async () => {
    try {
      const json = await exportLocalData();
      await Share.share({ title: "D-Eagle Hub backup", message: json });
    } catch {
      Alert.alert("Backup failed", "Could not create the local backup.");
    }
  };

  const importBackup = () => {
    if (Platform.OS !== "web") {
      Alert.alert("Import on web", "Open the app in a browser to import a JSON backup.");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const count = await importLocalData(String(reader.result ?? ""));
          Alert.alert("Backup imported", `${count} local items restored. Reload the app.`);
        } catch {
          Alert.alert("Import failed", "That file is not a valid D-Eagle Hub backup.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };
  if (!hydrated) return <ScreenContainer className="px-5" containerClassName="bg-background" maxWidth={520}><View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.primary} /></View></ScreenContainer>;

  return <ScreenContainer className="px-5" containerClassName="bg-background" maxWidth={520}><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>PROFILE & SETTINGS</Text><Text style={[styles.title, { color: colors.foreground }]}>Make Eagle fit you.</Text><Text style={[styles.subtitle, { color: colors.muted }]}>Quiet by default. Present when it counts.</Text>
    <View style={[styles.profileCard, { backgroundColor: colors.foreground }]}><View style={styles.profileAvatar}><Text style={styles.profileInitial}>{user?.name?.charAt(0) ?? "A"}</Text></View><View><Text style={styles.profileName}>{user?.name ?? "Guest mode"}</Text><Text style={styles.profileEmail}>{user?.email ?? (isAuthenticated ? "Synced across devices" : "Sign in to sync across devices")}</Text></View><Ionicons name="chevron-forward" size={18} color="#B5CAC6" style={styles.profileChevron} /></View>
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>DAILY RITUAL</Text><View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}><TimeSettingRow icon="sunny-outline" label="Morning briefing" hour={prefs.briefingHour} onPress={() => setPicker("briefing")} colors={colors} /><View style={[styles.divider, { backgroundColor: colors.border }]} /><TimeSettingRow icon="moon-outline" label="Nightly review" hour={prefs.reviewHour} onPress={() => setPicker("review")} colors={colors} /></View>
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>NOTIFICATIONS</Text><View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}><ToggleRow icon="notifications-outline" label="Standard reminders" value={prefs.notificationsEnabled} onValueChange={(value) => savePrefs({ notificationsEnabled: value })} colors={colors} /><View style={[styles.divider, { backgroundColor: colors.border }]} /><ToggleRow icon="volume-high-outline" label="Eagle voice alerts" value={prefs.voiceEnabled} onValueChange={(value) => savePrefs({ voiceEnabled: value })} colors={colors} /><View style={[styles.divider, { backgroundColor: colors.border }]} /><ToggleRow icon="musical-note-outline" label="Meeting countdown chime" value={!prefs.meetingChimeMuted} onValueChange={(value) => savePrefs({ meetingChimeMuted: !value })} colors={colors} /><View style={[styles.divider, { backgroundColor: colors.border }]} /><ToggleRow icon="alarm-outline" label="Five-minute meeting warning" value={!prefs.earlyWarningMuted} onValueChange={(value) => savePrefs({ earlyWarningMuted: !value })} colors={colors} /></View>
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>REGION</Text><View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}><SettingRow icon="globe-outline" label="Timezone" value="Local time" colors={colors} /><View style={[styles.divider, { backgroundColor: colors.border }]} /><SettingRow icon="language-outline" label="Language" value="English" colors={colors} /></View>
    <Text style={[styles.sectionLabel, { color: colors.muted }]}>HELP</Text><View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}><Pressable onPress={() => { AsyncStorage.setItem("deagle-onboarded-v1", "").then(() => Alert.alert("Intro reset", "Head back to Today — the introduction will show again.")); }} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><Ionicons name="sparkles-outline" size={19} color={colors.primary} /><Text style={[styles.rowLabel, { color: colors.foreground }]}>Show the intro again</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable></View>
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>DATA</Text>
    <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable onPress={exportBackup} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Ionicons name="download-outline" size={19} color={colors.primary} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>Export local backup</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Pressable>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Pressable onPress={importBackup} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Ionicons name="cloud-upload-outline" size={19} color={colors.primary} />
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>Import local backup</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </Pressable>
    </View><Text style={[styles.syncNote, { color: colors.muted }]}>Your data is stored locally on this device. Export a backup before changing devices or clearing browser storage.</Text>
    {picker && <DateTimePicker value={new Date(2020, 0, 1, picker === "briefing" ? prefs.briefingHour : prefs.reviewHour, 0)} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={(event: DateTimePickerEvent, selectedDate?: Date) => { if (Platform.OS !== "ios") setPicker(null); if (selectedDate) { const nextHour = selectedDate.getHours(); saveTimes(picker === "briefing" ? nextHour : prefs.briefingHour, picker === "review" ? nextHour : prefs.reviewHour); } }} />}
  </ScrollView></ScreenContainer>;
}
function SettingRow({ icon, label, value, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; colors: ReturnType<typeof useColors> }) { return <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]}><Ionicons name={icon} size={19} color={colors.primary} /><Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text><Text style={[styles.rowValue, { color: colors.muted }]}>{value}</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable>; }
function TimeSettingRow({ icon, label, hour, onPress, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; hour: number; onPress: () => void; colors: ReturnType<typeof useColors> }) { const displayHour = hour % 12 || 12; const suffix = hour >= 12 ? "PM" : "AM"; return <Pressable accessibilityLabel={`Set ${label} time`} onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}><Ionicons name={icon} size={19} color={colors.primary} /><Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text><Text style={[styles.rowValue, { color: colors.muted }]}>{displayHour}:00 {suffix}</Text><Ionicons name="chevron-forward" size={16} color={colors.muted} /></Pressable>; }
function ToggleRow({ icon, label, value, onValueChange, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: boolean; onValueChange: (value: boolean) => void; colors: ReturnType<typeof useColors> }) { return <View style={styles.row}><Ionicons name={icon} size={19} color={colors.primary} /><Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text><Switch value={value} onValueChange={onValueChange} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" /></View>; }
const styles = StyleSheet.create({ content: { paddingTop: 24, paddingBottom: 40 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 2.1, marginBottom: 8 }, title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.7 }, subtitle: { fontSize: 14, marginTop: 6, marginBottom: 22 }, profileCard: { borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", marginBottom: 28 }, profileAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#F4B942", alignItems: "center", justifyContent: "center", marginRight: 12 }, profileInitial: { color: "#10242A", fontWeight: "800", fontSize: 16 }, profileName: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 }, profileEmail: { color: "#B5CAC6", fontSize: 12, marginTop: 3 }, profileChevron: { marginLeft: "auto" }, sectionLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5, marginBottom: 9 }, group: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, marginBottom: 24 }, row: { minHeight: 54, flexDirection: "row", alignItems: "center" }, rowLabel: { flex: 1, marginLeft: 11, fontSize: 14, fontWeight: "600" }, rowValue: { fontSize: 13, marginRight: 8 }, timeButton: { width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#E9EFEC", marginHorizontal: 3 }, divider: { height: 1 }, syncNote: { fontSize: 11, lineHeight: 16, marginTop: -10, marginBottom: 20 }, signOut: { alignItems: "center", paddingVertical: 18 }, signIn: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 22 }, signInText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 }, pressed: { opacity: 0.72 } });


