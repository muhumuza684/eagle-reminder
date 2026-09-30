// Today: say what to remember, pick when, get reminded. Everything stays on this device.

import AsyncStorage from "@/lib/secure-storage";
import { readJsonSafely, writeJsonSafely } from "@/lib/safe-json";
import { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import WhenPicker, { formatHHMM } from "@/components/when-picker";
import { useColors } from "@/hooks/use-colors";
import { useVoiceCapture } from "@/hooks/use-voice-capture";
import { parseCommitment } from "@/lib/commitment-parser";
import { createClientId } from "@/lib/identity";
import { cancelReminder, requestLocalNotificationPermission, scheduleReminder } from "@/lib/native-services";
import { nextScheduledDate, needsRegeneration, type Recurrence } from "@/lib/recurrence";
import { radii } from "@/constants/radii";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

type CommitmentStatus = "active" | "completed" | "rescheduled" | "missed";
type RiskState = "stable" | "at_risk" | "rescued" | "missed";
type Priority = "high" | "medium" | "low";

type Commitment = {
  id: string;
  title: string;
  category: string;
  scheduledDate: string;
  timeStart: string;
  timeEnd: string;
  priority: Priority;
  status: CommitmentStatus;
  riskState: RiskState;
  deletedAt?: string;
  recurrence?: Recurrence;
};

const STORAGE_KEY = "deagle-commitments-v1";
const REMINDERS_STORAGE_KEY = "deagle-reminders-v1";
const ONBOARDING_KEY = "deagle-onboarded-v1";
const UNDO_WINDOW_MS = 6000;
const DEMO_IDS = new Set(["1", "2", "3"]);
const DEMO_TITLES = new Set(["Send revised proposal to Maya", "Pick up prescription", "Call Dad about Sunday"]);

const ONBOARDING_SLIDES = [
  { icon: "chatbubble-ellipses-outline" as const, title: "Say what to remember", body: "Type it or speak it. For example: Call Mum tomorrow at 7 pm." },
  { icon: "calendar-outline" as const, title: "Pick the day and time", body: "Use the calendar and the clock, then tap Set reminder." },
  { icon: "alarm-outline" as const, title: "We remind you", body: "You get a notification at that time. Tick it off, snooze it, or change the time." },
];

function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isOpen(item: Commitment): boolean {
  return !item.deletedAt && (item.status === "active" || item.status === "rescheduled");
}

function whenOf(item: Commitment): Date | null {
  const [y, m, d] = item.scheduledDate.split("-").map(Number);
  const [h, mi] = item.timeStart.split(":").map(Number);
  if ([y, m, d, h, mi].some((part) => Number.isNaN(part))) return null;
  return new Date(y, m - 1, d, h, mi, 0, 0);
}

// One scheduled reminder per open commitment. The ids survive restarts.
let reminderIds: Record<string, string> = {};

function saveReminderIds() {
  writeJsonSafely(REMINDERS_STORAGE_KEY, reminderIds).catch(() => undefined);
}

async function applyReminder(item: Commitment) {
  const existing = reminderIds[item.id];
  if (existing) {
    delete reminderIds[item.id];
    await cancelReminder(existing);
  }
  if (isOpen(item)) {
    const when = whenOf(item);
    if (when) {
      const scheduledId = await scheduleReminder(item.id, item.title, when);
      if (scheduledId) reminderIds[item.id] = scheduledId;
    }
  }
  saveReminderIds();
}

function ActionButton({ icon, label, onPress, primary, colors }: {
  icon: "checkmark" | "alarm-outline" | "time-outline";
  label: string;
  onPress: () => void;
  primary?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionButton,
        primary ? { backgroundColor: colors.primary } : { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={15} color={primary ? "#FFFFFF" : colors.foreground} />
      <Text style={[styles.actionText, { color: primary ? "#FFFFFF" : colors.foreground }]}>{label}</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const wide = width >= 1000;

  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [capture, setCapture] = useState("");
  const [pickedDate, setPickedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(true);
  const [editing, setEditing] = useState<{ id: string; when: Date } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isListening, setIsListening] = useState(false);
  const [toast, setToast] = useState("");
  const [undoNotice, setUndoNotice] = useState<{ id: string; title: string } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const pendingDeleteRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  const flash = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 3600);
  };

  // ---------- load saved data, then re-arm every open reminder ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await readJsonSafely<Record<string, string>>(
        REMINDERS_STORAGE_KEY,
        {},
        (value): value is Record<string, string> => typeof value === "object" && value !== null && !Array.isArray(value),
      );
      reminderIds = stored.value;
      const result = await readJsonSafely<Commitment[]>(STORAGE_KEY, [], (value): value is Commitment[] => Array.isArray(value));
      if (cancelled) return;
      const cleaned = result.value.filter((item) => !(DEMO_IDS.has(item.id) && DEMO_TITLES.has(item.title)));
      setCommitments(cleaned);
      setHydrated(true);
      cleaned.forEach((item) => { applyReminder(item).catch(() => undefined); });
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((seen) => { if (!seen) setShowOnboarding(true); });
  }, []);

  // Debounced so the encrypted save does not run on every small change.
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => { writeJsonSafely(STORAGE_KEY, commitments).catch(() => undefined); }, 300);
    return () => clearTimeout(timer);
  }, [commitments, hydrated]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Repeating reminders: when one is done, create the next occurrence.
  useEffect(() => {
    if (!hydrated) return;
    const todayKey = localDateKey(new Date());
    const sources = commitments.filter((item) => needsRegeneration(item, todayKey));
    if (sources.length === 0) return;
    const sourceIds = new Set(sources.map((item) => item.id));
    const fresh: Commitment[] = sources.map((source) => ({
      ...source,
      id: createClientId(),
      scheduledDate: nextScheduledDate(source.scheduledDate, source.recurrence!),
      status: "active" as const,
      riskState: "stable" as const,
      deletedAt: undefined,
    }));
    setCommitments((items) => [
      ...items.map((item) => (sourceIds.has(item.id) ? { ...item, recurrence: "none" as const } : item)),
      ...fresh,
    ]);
    fresh.forEach((item) => { applyReminder(item).catch(() => undefined); });
  }, [commitments, hydrated]);

  // ---------- voice capture ----------
  const { start: startVoice, stop: stopVoice, isSupported: voiceSupported } = useVoiceCapture({
    onResult: ({ transcript, isFinal }) => {
      if (transcript) setCapture(transcript);
      if (isFinal) setIsListening(false);
    },
    onError: () => setIsListening(false),
    onEnd: () => setIsListening(false),
  });

  const toggleVoice = async () => {
    if (!voiceSupported) { flash("Voice capture is not available here"); return; }
    if (isListening) { stopVoice(); setIsListening(false); return; }
    const started = await startVoice();
    setIsListening(started);
  };

  // ---------- actions ----------
  const update = (id: string, patch: Partial<Commitment>) => {
    const current = commitments.find((item) => item.id === id);
    setCommitments((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    if (current) applyReminder({ ...current, ...patch }).catch(() => undefined);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const snooze = (item: Commitment) => {
    const later = new Date(Date.now() + 10 * 60 * 1000);
    update(item.id, {
      status: "active",
      scheduledDate: localDateKey(later),
      timeStart: formatHHMM(later),
      timeEnd: formatHHMM(new Date(later.getTime() + 30 * 60 * 1000)),
    });
  };

  const openChange = (item: Commitment) => {
    let when = whenOf(item) ?? new Date();
    if (when.getTime() < Date.now()) {
      when = new Date();
      when.setHours(when.getHours() + 1, 0, 0, 0);
    }
    setEditing({ id: item.id, when });
  };

  const saveChange = () => {
    if (editing) {
      update(editing.id, {
        scheduledDate: localDateKey(editing.when),
        timeStart: formatHHMM(editing.when),
        timeEnd: formatHHMM(new Date(editing.when.getTime() + 30 * 60 * 1000)),
        status: "active",
        riskState: "stable",
      });
    }
    setEditing(null);
  };

  const finalizeDelete = (id: string) => {
    setCommitments((items) => items.filter((item) => item.id !== id));
  };

  const settlePendingDelete = () => {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      finalizeDelete(pendingDeleteRef.current.id);
      pendingDeleteRef.current = null;
    }
  };

  const removeCommitment = (item: Commitment) => {
    settlePendingDelete();
    const deletedAt = new Date().toISOString();
    setCommitments((items) => items.map((entry) => (entry.id === item.id ? { ...entry, deletedAt } : entry)));
    applyReminder({ ...item, deletedAt }).catch(() => undefined);
    const timer = setTimeout(() => {
      finalizeDelete(item.id);
      pendingDeleteRef.current = null;
      setUndoNotice((current) => (current?.id === item.id ? null : current));
    }, UNDO_WINDOW_MS);
    pendingDeleteRef.current = { id: item.id, timer };
    setUndoNotice({ id: item.id, title: item.title });
  };

  const undoDelete = () => {
    if (!pendingDeleteRef.current) return;
    clearTimeout(pendingDeleteRef.current.timer);
    const id = pendingDeleteRef.current.id;
    pendingDeleteRef.current = null;
    const item = commitments.find((entry) => entry.id === id);
    setCommitments((items) => items.map((entry) => (entry.id === id ? { ...entry, deletedAt: undefined } : entry)));
    if (item) applyReminder({ ...item, deletedAt: undefined }).catch(() => undefined);
    setUndoNotice(null);
  };

  const addCommitment = () => {
    const text = capture.trim();
    if (!text) return;
    const parsed = parseCommitment(text);
    const withTime = pickedDate
      ? {
          ...parsed,
          scheduledDate: localDateKey(pickedDate),
          timeStart: formatHHMM(pickedDate),
          timeEnd: formatHHMM(new Date(pickedDate.getTime() + 30 * 60 * 1000)),
        }
      : parsed;
    const next: Commitment = { ...withTime };
    setCommitments((items) => [...items, next]);
    requestLocalNotificationPermission().catch(() => undefined);
    applyReminder(next).catch(() => undefined);
    setCapture("");
    setPickedDate(null);
    if (!wide) setShowPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const finishOnboarding = () => {
    AsyncStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
    setOnboardingStep(0);
  };

  // ---------- what to show ----------
  const upcoming = useMemo(
    () => commitments
      .filter(isOpen)
      .sort((a, b) => `${a.scheduledDate} ${a.timeStart}`.localeCompare(`${b.scheduledDate} ${b.timeStart}`)),
    [commitments],
  );

  const groups = useMemo(() => {
    const todayKey = localDateKey(new Date(now));
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = localDateKey(tomorrow);
    const result: { label: string; items: Commitment[] }[] = [];
    for (const item of upcoming) {
      const when = whenOf(item);
      let label: string;
      if (when && when.getTime() < now) label = "Overdue";
      else if (item.scheduledDate === todayKey) label = "Today";
      else if (item.scheduledDate === tomorrowKey) label = "Tomorrow";
      else label = when ? when.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : item.scheduledDate;
      const last = result[result.length - 1];
      if (last && last.label === label) last.items.push(item);
      else result.push({ label, items: [item] });
    }
    return result;
  }, [upcoming, now]);

  const dateLabel = new Date(now).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const pickerOpen = wide || showPicker;
  const pickedSummary = pickedDate
    ? `${pickedDate.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} at ${pickedDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : "Choose day and time";
  const timeText = (item: Commitment) => {
    const when = whenOf(item);
    const clock = when ? when.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : item.timeStart;
    const repeat = item.recurrence && item.recurrence !== "none" ? ` - repeats ${item.recurrence}` : "";
    return `${clock}${repeat}`;
  };

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.foreground }]}>Reminders</Text>
          <Text style={[styles.date, { color: colors.muted }]}>
            {dateLabel}{upcoming.length > 0 ? ` - ${upcoming.length} coming up` : ""}
          </Text>
        </View>

        <View style={wide ? styles.columns : undefined}>
          <View style={wide ? styles.leftColumn : undefined}>
            <View style={[styles.inputBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                value={capture}
                onChangeText={setCapture}
                onSubmitEditing={addCommitment}
                returnKeyType="done"
                placeholder="What should we remind you about?"
                placeholderTextColor={colors.muted}
                style={[styles.input, { color: colors.foreground }]}
              />
              <Pressable
                onPress={toggleVoice}
                accessibilityLabel={isListening ? "Stop listening" : "Start voice capture"}
                style={({ pressed }) => [styles.micButton, { backgroundColor: isListening ? "#F8444F" : colors.border }, pressed && styles.pressed]}
              >
                <Ionicons name={isListening ? "stop" : "mic"} size={17} color={isListening ? "#FFFFFF" : colors.foreground} />
              </Pressable>
            </View>
            <Text style={[styles.hint, { color: colors.muted }]}>Try "Call Mum tomorrow at 7 pm"</Text>

            {!wide ? (
              <Pressable onPress={() => setShowPicker((open) => !open)} style={({ pressed }) => [styles.whenToggle, { borderColor: colors.border }, pressed && styles.pressed]}>
                <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                <Text style={[styles.whenToggleText, { color: pickedDate ? colors.foreground : colors.muted }]}>{pickedSummary}</Text>
                <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
              </Pressable>
            ) : null}

            {pickerOpen ? <WhenPicker value={pickedDate} onChange={setPickedDate} /> : null}

            <Pressable
              onPress={addCommitment}
              disabled={!capture.trim()}
              accessibilityRole="button"
              accessibilityLabel="Set reminder"
              style={({ pressed }) => [styles.saveButton, { backgroundColor: capture.trim() ? colors.primary : colors.border }, pressed && styles.pressed]}
            >
              <Ionicons name="alarm-outline" size={18} color="#FFFFFF" />
              <Text style={styles.saveText}>Set reminder</Text>
            </Pressable>
          </View>

          <View style={wide ? styles.rightColumn : styles.listBlock}>
            {groups.map((group) => (
              <View key={group.label} style={styles.group}>
                <Text style={[styles.groupLabel, { color: group.label === "Overdue" ? "#F8444F" : colors.muted }]}>{group.label.toUpperCase()}</Text>
                {group.items.map((item) => (
                  <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: group.label === "Overdue" ? "#F8444F" : colors.border }]}>
                    <View style={styles.cardMain}>
                      <View style={styles.cardCopy}>
                        <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={3}>{item.title}</Text>
                        <Text style={[styles.cardWhen, { color: colors.muted }]}>{timeText(item)}</Text>
                      </View>
                      <Pressable onPress={() => removeCommitment(item)} accessibilityLabel={`Delete ${item.title}`} hitSlop={10}>
                        <Ionicons name="trash-outline" size={18} color={colors.muted} />
                      </Pressable>
                    </View>
                    <View style={[styles.actions, { borderTopColor: colors.border }]}>
                      <ActionButton icon="checkmark" label="Done" primary colors={colors} onPress={() => update(item.id, { status: "completed", riskState: "stable" })} />
                      <ActionButton icon="alarm-outline" label="Snooze 10m" colors={colors} onPress={() => snooze(item)} />
                      <ActionButton icon="time-outline" label="Change" colors={colors} onPress={() => openChange(item)} />
                    </View>
                  </View>
                ))}
              </View>
            ))}

            {upcoming.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="alarm-outline" size={30} color={colors.muted} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No reminders yet</Text>
                <Text style={[styles.emptyBody, { color: colors.muted }]}>Type what to remember, pick a day and time, then tap Set reminder.</Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View pointerEvents="box-none" style={styles.toastStack}>
        {toast ? <View style={[styles.toast, { backgroundColor: colors.foreground }]}><Text style={styles.toastText}>{toast}</Text></View> : null}
        {undoNotice ? (
          <View style={[styles.toast, { backgroundColor: colors.foreground }]}>
            <Text style={styles.toastText}>Deleted "{undoNotice.title}"</Text>
            <Pressable onPress={undoDelete}><Text style={styles.toastAction}>Undo</Text></Pressable>
          </View>
        ) : null}
      </View>

      <Modal visible={!!editing} transparent animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.sheet, { backgroundColor: colors.background }, wide ? styles.wideSheet : null]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetEyebrow, { color: colors.primary }]}>CHANGE DAY OR TIME</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <WhenPicker value={editing?.when ?? null} onChange={(next) => { if (next) setEditing((current) => (current ? { ...current, when: next } : current)); }} />
              <View style={styles.sheetActions}>
                <Pressable onPress={saveChange} style={({ pressed }) => [styles.primaryAction, { backgroundColor: colors.primary }, pressed && styles.pressed]}>
                  <Text style={styles.primaryActionText}>Save</Text>
                </Pressable>
                <Pressable onPress={() => setEditing(null)} style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border }, pressed && styles.pressed]}>
                  <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showOnboarding} transparent animationType="fade" onRequestClose={finishOnboarding}>
        <View style={[styles.modalBackdrop, { justifyContent: "center" }]}>
          <View style={[styles.dialog, { backgroundColor: colors.background }]}>
            <View style={styles.dialogIcon}><Ionicons name={ONBOARDING_SLIDES[onboardingStep].icon} size={30} color={colors.primary} /></View>
            <Text style={[styles.dialogTitle, { color: colors.foreground }]}>{ONBOARDING_SLIDES[onboardingStep].title}</Text>
            <Text style={[styles.dialogBody, { color: colors.muted }]}>{ONBOARDING_SLIDES[onboardingStep].body}</Text>
            <View style={styles.dots}>
              {ONBOARDING_SLIDES.map((_, index) => (
                <View key={index} style={{ width: index === onboardingStep ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: index === onboardingStep ? colors.primary : colors.border }} />
              ))}
            </View>
            <View style={styles.sheetActions}>
              {onboardingStep < ONBOARDING_SLIDES.length - 1 ? (
                <>
                  <Pressable onPress={() => setOnboardingStep((step) => step + 1)} style={[styles.primaryAction, { backgroundColor: colors.primary }]}>
                    <Text style={styles.primaryActionText}>Next</Text>
                  </Pressable>
                  <Pressable onPress={finishOnboarding} style={[styles.secondaryAction, { borderColor: colors.border }]}>
                    <Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Skip</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable onPress={finishOnboarding} style={[styles.primaryAction, { backgroundColor: colors.primary }]}>
                  <Text style={styles.primaryActionText}>Got it</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxl, paddingBottom: spacing.huge },
  header: { marginBottom: spacing.xl },
  title: { ...typography.display },
  date: { ...typography.body, marginTop: spacing.xs },
  columns: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xxl },
  leftColumn: { width: 400 },
  rightColumn: { flex: 1 },
  listBlock: { marginTop: spacing.xl },
  inputBox: { flexDirection: "row", alignItems: "center", borderRadius: 22, borderWidth: 1, padding: spacing.sm },
  input: { flex: 1, ...typography.body, paddingHorizontal: spacing.md, height: 40 },
  micButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  hint: { ...typography.caption, marginTop: spacing.sm, marginLeft: spacing.md },
  whenToggle: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderRadius: radii.card, padding: spacing.md, marginTop: spacing.md },
  whenToggleText: { flex: 1, ...typography.bodySmall, fontWeight: "700" },
  saveButton: { minHeight: 52, borderRadius: radii.card, marginTop: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  saveText: { color: "#FFFFFF", ...typography.body, fontWeight: "800" },
  group: { marginBottom: spacing.xl },
  groupLabel: { ...typography.label, marginBottom: spacing.sm },
  card: { borderWidth: 1, borderRadius: radii.card, padding: spacing.lg, marginBottom: spacing.sm },
  cardMain: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  cardCopy: { flex: 1 },
  cardTitle: { ...typography.body, fontWeight: "800" },
  cardWhen: { ...typography.caption, marginTop: spacing.xs },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, borderTopWidth: 1, marginTop: spacing.md, paddingTop: spacing.md },
  actionButton: { minHeight: 34, paddingHorizontal: spacing.md, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  actionText: { fontSize: 11, fontWeight: "800" },
  empty: { alignItems: "center", paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyTitle: { ...typography.subtitle, fontWeight: "700" },
  emptyBody: { ...typography.bodySmall, textAlign: "center" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  toastStack: { position: "absolute", left: 0, right: 0, bottom: 24, alignItems: "center", gap: spacing.sm },
  toast: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.card },
  toastText: { color: "#FFFFFF", ...typography.caption, fontWeight: "700" },
  toastAction: { color: "#78BDC4", ...typography.caption, fontWeight: "800", marginLeft: spacing.sm },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(16,36,42,0.46)" },
  sheet: { maxHeight: "92%", borderTopLeftRadius: radii.sheet + 4, borderTopRightRadius: radii.sheet + 4, padding: spacing.xxl, paddingBottom: spacing.xxxl },
  wideSheet: { width: "100%", maxWidth: 560, alignSelf: "center" },
  sheetHandle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "#CBD5D3", marginBottom: spacing.xl },
  sheetEyebrow: { ...typography.label, marginBottom: spacing.sm },
  sheetActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xl },
  primaryAction: { flex: 1, minHeight: 50, borderRadius: radii.chip + 3, alignItems: "center", justifyContent: "center" },
  primaryActionText: { color: "#FFFFFF", ...typography.body, fontWeight: "800" },
  secondaryAction: { flex: 0.6, minHeight: 50, borderRadius: radii.chip + 3, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  secondaryActionText: { ...typography.body, fontWeight: "700" },
  dialog: { width: "92%", maxWidth: 460, alignSelf: "center", borderRadius: radii.sheet, padding: spacing.xl },
  dialogIcon: { alignItems: "center", marginBottom: spacing.md },
  dialogTitle: { ...typography.title, textAlign: "center" },
  dialogBody: { ...typography.body, textAlign: "center", marginTop: spacing.sm, marginBottom: spacing.lg },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6 },
});