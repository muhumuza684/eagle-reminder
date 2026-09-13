// MERGED (round 2) — base is the "d_full" build's rewrite of this screen,
// which fixed a real bug: this tab previously showed hardcoded demo data
// instead of the actual day's commitments. The only change here is
// switching the checkpoint acknowledge wiring from a boolean `acknowledged`
// field + a separate `acknowledge` mutation to the merged status-enum model
// (`item.status !== "acknowledged"` / `checkpoints.update.mutate({ id, status })`),
// matching schema.ts and routers.ts in this package. See MERGE-NOTES.md.

import { useCallback, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import { readJsonSafely, writeJsonSafely } from "@/lib/safe-json";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { cloudRowToCommitment, mergeCommitments, type SyncableCommitment } from "@/lib/commitment-sync";
import { trpc } from "@/lib/trpc";

// Mirrors the shape owned by app/(tabs)/index.tsx and the same AsyncStorage
// key, since both screens read/write the same on-device commitment list.
const STORAGE_KEY = "deagle-commitments-v1";

type CommitmentStatus = "active" | "completed" | "rescheduled" | "missed";
type RiskState = "stable" | "at_risk" | "rescued" | "missed";
// Tier 3 #11 — was its own near-duplicate type with no scheduledDate at
// all, same as index.tsx before this fix (see FIXES-LOG.md). Reusing
// SyncableCommitment directly here instead of maintaining two shapes.
type ReviewCommitment = SyncableCommitment;

function checkpointCopy(stage: "day_before" | "three_hours") {
  return stage === "day_before" ? "One day before" : "Three hours before";
}

export default function ReviewScreen() {
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [commitments, setCommitments] = useState<ReviewCommitment[]>([]);
  const [pendingReschedule, setPendingReschedule] = useState<string | null>(null);
  // Consistency fix found while working on loading states: applyStatus
  // below had the same silent-failure gap that index.tsx's update() had
  // before Tier 1 #1 — a status change made from Review could fail to
  // sync with no feedback at all. Small, local fix rather than full parity
  // with index.tsx's per-item syncFailed badge, since this screen is
  // transient by design.
  const [syncNotice, setSyncNotice] = useState("");

  const cloudCommitments = trpc.commitments.list.useQuery(undefined, { enabled: isAuthenticated });
  const updateCloudCommitment = trpc.commitments.update.useMutation();
  const checkpoints = trpc.checkpoints.list.useQuery(undefined, { enabled: isAuthenticated });
  const updateCheckpoint = trpc.checkpoints.update.useMutation({ onSuccess: () => checkpoints.refetch() });

  // Re-read on every tab focus (Tabs keep screens mounted, so a mount-only
  // effect would miss changes made from the Today tab in the same session).
  useFocusEffect(useCallback(() => {
    readJsonSafely<ReviewCommitment[]>(STORAGE_KEY, [], (value): value is ReviewCommitment[] => Array.isArray(value)).then((result) => { setCommitments(result.value); });
  }, []));

  useFocusEffect(useCallback(() => {
    if (isAuthenticated && cloudCommitments.data) {
      setCommitments((current) => mergeCommitments(current, cloudCommitments.data));
    }
  }, [isAuthenticated, cloudCommitments.data]));

  const persist = (next: ReviewCommitment[]) => { setCommitments(next); writeJsonSafely(STORAGE_KEY, next).catch(() => undefined); };

  const applyStatus = (id: string, status: CommitmentStatus, riskState: RiskState) => {
    persist(commitments.map((item) => (item.id === id ? { ...item, status, riskState } : item)));
    if (isAuthenticated && /^\d+$/.test(id)) {
      updateCloudCommitment.mutate(
        { id: Number(id), status, riskState },
        { onError: () => { setSyncNotice("Couldn't sync that to the cloud — it's saved on this device and Eagle will retry next time Today refreshes."); setTimeout(() => setSyncNotice(""), 4200); } }
      );
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const markCompleted = (id: string) => applyStatus(id, "completed", "stable");
  const markMissed = (id: string) => { setPendingReschedule(id); };
  const confirmReschedule = (moveToTomorrow: boolean) => {
    if (pendingReschedule) applyStatus(pendingReschedule, moveToTomorrow ? "rescheduled" : "missed", moveToTomorrow ? "rescued" : "missed");
    setPendingReschedule(null);
  };

  const todayKey = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const todayCommitments = useMemo(() => commitments.filter((c) => c.scheduledDate === todayKey && !c.deletedAt), [commitments, todayKey]);
  const buckets = useMemo(() => ({
    open: todayCommitments.filter((c) => c.status === "active"),
    completed: todayCommitments.filter((c) => c.status === "completed"),
    rescheduled: todayCommitments.filter((c) => c.status === "rescheduled"),
    missed: todayCommitments.filter((c) => c.status === "missed"),
  }), [todayCommitments]);

  // Tier 3 #11 — the history view. Everything that isn't today, grouped by
  // date and sorted most-recent-first. Kept to a simple expandable list
  // (one date open at a time) rather than a full calendar picker, matching
  // this product's own "silence is a feature" / progressive-disclosure
  // instinct rather than adding a new screen's worth of chrome.
  const [expandedDate, setExpandedDate] = useState<string | null>(null);
  const pastDays = useMemo(() => {
    const groups = new Map<string, ReviewCommitment[]>();
    for (const item of commitments) {
      if (item.scheduledDate === todayKey || item.deletedAt) continue;
      const list = groups.get(item.scheduledDate) ?? [];
      list.push(item);
      groups.set(item.scheduledDate, list);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 14); // last two weeks of history is plenty for a "what happened recently" view
  }, [commitments, todayKey]);

  const openCheckpoints = useMemo(() => (checkpoints.data ?? []).filter((item) => item.status !== "acknowledged").sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()), [checkpoints.data]);
  const pendingItem = commitments.find((c) => c.id === pendingReschedule);

  return <ScreenContainer className="px-5" containerClassName="bg-background"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <Text style={[styles.eyebrow, { color: colors.primary }]}>NIGHTLY REVIEW</Text>
    <Text style={[styles.title, { color: colors.foreground }]}>Close the loop.</Text>
    <Text style={[styles.subtitle, { color: colors.muted }]}>A two-minute reset so tomorrow starts lighter.</Text>
    <View style={[styles.prompt, { backgroundColor: colors.foreground }]}><Ionicons name="moon" size={21} color="#F4B942" /><Text style={styles.promptText}>Anything unmarked by midnight becomes missed. Eagle will help you carry forward what matters.</Text></View>
    {syncNotice ? <View style={{ flexDirection: "row", gap: 8, alignItems: "center", backgroundColor: "#FCE5E0", borderRadius: 12, padding: 10, marginBottom: 16 }}><Ionicons name="cloud-offline-outline" size={15} color="#E87561" /><Text style={{ flex: 1, fontSize: 11, color: "#9B4A3D" }}>{syncNotice}</Text></View> : null}

    {buckets.open.length > 0 && <View style={styles.bucketSection}>
      <View style={styles.bucketHeader}><View style={[styles.bucketIcon, { backgroundColor: "#E9EFEC" }]}><Ionicons name="ellipse-outline" size={17} color={colors.muted} /></View><Text style={[styles.bucketTitle, { color: colors.foreground }]}>Still open</Text><Text style={[styles.bucketCount, { color: colors.muted }]}>{buckets.open.length}</Text></View>
      {buckets.open.map((item) => <View key={item.id} style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <Text style={[styles.itemText, { color: colors.foreground }]}>{item.title}</Text>
        <View style={styles.itemActions}>
          <Pressable accessibilityLabel="Mark completed" onPress={() => markCompleted(item.id)} style={({ pressed }) => [styles.markButton, { backgroundColor: "#0B6E69" }, pressed && styles.pressed]}><Ionicons name="checkmark" size={15} color="#FFFFFF" /></Pressable>
          <Pressable accessibilityLabel="Mark missed" onPress={() => markMissed(item.id)} style={({ pressed }) => [styles.markButton, { backgroundColor: "#E87561" }, pressed && styles.pressed]}><Ionicons name="close" size={15} color="#FFFFFF" /></Pressable>
        </View>
      </View>)}
    </View>}

    {(["completed", "rescheduled", "missed"] as const).map((bucket) => {
      const items = buckets[bucket];
      if (items.length === 0) return null;
      const meta = bucket === "completed" ? { label: "Completed", bg: "#DDEDEA", icon: "checkmark-circle" as const, color: "#0B6E69" } : bucket === "rescheduled" ? { label: "Rescheduled", bg: "#FFF4D9", icon: "time" as const, color: "#F4B942" } : { label: "Missed", bg: "#FCE5E0", icon: "close-circle" as const, color: "#E87561" };
      return <View key={bucket} style={styles.bucketSection}>
        <View style={styles.bucketHeader}><View style={[styles.bucketIcon, { backgroundColor: meta.bg }]}><Ionicons name={meta.icon} size={18} color={meta.color} /></View><Text style={[styles.bucketTitle, { color: colors.foreground }]}>{meta.label}</Text><Text style={[styles.bucketCount, { color: colors.muted }]}>{items.length}</Text></View>
        {items.map((item) => <View key={item.id} style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surface }]}><Text style={[styles.itemText, { color: colors.foreground }]}>{item.title}</Text><Ionicons name={meta.icon} size={18} color={meta.color} /></View>)}
      </View>;
    })}

    {isAuthenticated && cloudCommitments.isLoading && commitments.length === 0 && <View style={{ alignItems: "center", paddingVertical: 24 }}><ActivityIndicator color={colors.primary} /><Text style={[styles.emptyCheckpoints, { color: colors.muted, marginTop: 10 }]}>Loading today's review…</Text></View>}
    {!(isAuthenticated && cloudCommitments.isLoading && commitments.length === 0) && todayCommitments.length === 0 && <Text style={[styles.emptyCheckpoints, { color: colors.muted }]}>Nothing captured for today yet — head to the Today tab.</Text>}

    {isAuthenticated && <View style={styles.bucketSection}>
      <View style={styles.bucketHeader}><View style={[styles.bucketIcon, { backgroundColor: "#FCE5E0" }]}><Ionicons name="flag" size={17} color="#E87561" /></View><Text style={[styles.bucketTitle, { color: colors.foreground }]}>Critical checkpoints</Text><Text style={[styles.bucketCount, { color: colors.muted }]}>{openCheckpoints.length}</Text></View>
      {openCheckpoints.length === 0 && <Text style={[styles.emptyCheckpoints, { color: colors.muted }]}>Nothing waiting on a "don't let me forget" checkpoint right now.</Text>}
      {openCheckpoints.map((checkpoint) => <View key={checkpoint.id} style={[styles.checkpointItem, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={styles.checkpointCopy}>
          <Text style={[styles.checkpointStage, { color: "#9B6A00" }]}>{checkpointCopy(checkpoint.stage)}</Text>
          <Text style={[styles.checkpointDue, { color: colors.muted }]}>Due {new Date(checkpoint.dueAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Text>
        </View>
        <Pressable accessibilityLabel="Acknowledge checkpoint" onPress={() => updateCheckpoint.mutate({ id: checkpoint.id, status: "acknowledged" })} style={({ pressed }) => [styles.ackButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Ionicons name="checkmark" size={15} color="#FFFFFF" /></Pressable>
      </View>)}
    </View>}

    {pastDays.length > 0 && <View style={styles.bucketSection}>
      <View style={styles.bucketHeader}><View style={[styles.bucketIcon, { backgroundColor: "#E9EFEC" }]}><Ionicons name="time-outline" size={17} color={colors.muted} /></View><Text style={[styles.bucketTitle, { color: colors.foreground }]}>Past days</Text></View>
      {pastDays.map(([date, items]) => {
        const completedCount = items.filter((i) => i.status === "completed").length;
        const missedCount = items.filter((i) => i.status === "missed").length;
        const isOpen = expandedDate === date;
        return <View key={date}>
          <Pressable onPress={() => setExpandedDate(isOpen ? null : date)} style={({ pressed }) => [styles.item, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && styles.pressed]}>
            <Text style={[styles.itemText, { color: colors.foreground }]}>{new Date(date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}</Text>
            <Text style={{ fontSize: 11, color: colors.muted, marginRight: 8 }}>{completedCount} done · {missedCount} missed</Text>
            <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={colors.muted} />
          </Pressable>
          {isOpen && items.map((item) => <View key={item.id} style={[styles.item, { borderColor: colors.border, backgroundColor: colors.surface, marginLeft: 14 }]}>
            <Text style={[styles.itemText, { color: colors.foreground }]}>{item.title}</Text>
            <Ionicons name={item.status === "completed" ? "checkmark-circle" : item.status === "missed" ? "close-circle" : "time"} size={16} color={item.status === "completed" ? "#0B6E69" : item.status === "missed" ? "#E87561" : "#F4B942"} />
          </View>)}
        </View>;
      })}
    </View>}

    {pendingItem && <View style={[styles.ask, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Text style={[styles.askEyebrow, { color: colors.primary }]}>EAGLE ASKS</Text>
      <Text style={[styles.askTitle, { color: colors.foreground }]}>Would you like to move "{pendingItem.title}" to tomorrow?</Text>
      <View style={styles.askActions}>
        <Pressable onPress={() => confirmReschedule(true)} style={({ pressed }) => [styles.button, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.buttonText}>Yes, move it</Text></Pressable>
        <Pressable onPress={() => confirmReschedule(false)} style={styles.laterAction}><Text style={[styles.laterText, { color: colors.muted }]}>No, leave it missed</Text></Pressable>
      </View>
    </View>}
  </ScrollView></ScreenContainer>;
}
const styles = StyleSheet.create({ content: { paddingTop: 24, paddingBottom: 40 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 2.1, marginBottom: 8 }, title: { fontSize: 30, fontWeight: "700", letterSpacing: -0.7 }, subtitle: { fontSize: 14, marginTop: 6, marginBottom: 22 }, prompt: { borderRadius: 18, padding: 16, flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 28 }, promptText: { flex: 1, color: "#D9E4E1", fontSize: 13, lineHeight: 19 }, bucketSection: { marginBottom: 22 }, bucketHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 }, bucketIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 10 }, bucketTitle: { fontSize: 16, fontWeight: "700", flex: 1 }, bucketCount: { fontSize: 13, fontWeight: "700" }, item: { minHeight: 52, borderRadius: 13, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 7 }, itemText: { flex: 1, fontSize: 13, fontWeight: "600" }, itemActions: { flexDirection: "row", gap: 6 }, markButton: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" }, emptyCheckpoints: { fontSize: 12, lineHeight: 17, marginBottom: 10 }, checkpointItem: { minHeight: 56, borderRadius: 13, borderWidth: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, marginBottom: 7 }, checkpointCopy: { flex: 1 }, checkpointStage: { fontSize: 13, fontWeight: "700" }, checkpointDue: { fontSize: 11, marginTop: 3 }, ackButton: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" }, ask: { borderRadius: 18, borderWidth: 1, padding: 17, marginTop: 4 }, askEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5 }, askTitle: { fontSize: 16, lineHeight: 22, fontWeight: "700", marginTop: 9, marginBottom: 16 }, askActions: { gap: 8 }, button: { height: 47, borderRadius: 14, alignItems: "center", justifyContent: "center" }, buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" }, laterAction: { alignItems: "center", paddingVertical: 8 }, laterText: { fontSize: 13, fontWeight: "600" }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] } });


