// MERGED (round 2) — base is the "d_full" build's index.tsx (voice capture,
// meeting integration, the natural-language "don't let me forget" capture +
// ambiguous-deadline prompt, real criticalDeadline/warningMuted cloud sync).
// Grafted in from the "e_complete" build: the FR-G3 acknowledge/escalate/
// expire checkpoint state machine, the 30s escalation tick (reusing the
// existing `now` ticker rather than adding a second timer), the cascade
// status badge on Today, and the per-checkpoint acknowledge list in the
// commitment detail sheet. See MERGE-NOTES.md for the full breakdown,
// including one real, honestly-flagged gap: checkpoint acknowledgments are
// not yet synced to the server, because the client only tracks checkpoints
// by commitment id, not by their own row id in the criticalCheckpoints
// table — search "known gap" in this file and in MERGE-NOTES.md.

import AsyncStorage from "@/lib/secure-storage";
import { readJsonSafely, writeJsonSafely } from "@/lib/safe-json";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from "expo-speech-recognition";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { extractMeetingLink, normalizeMeetingUrl, parseCommitment, validateMeetingUrl } from "@/lib/commitment-parser";
import { cloudRowToCommitment, mergeCommitments } from "@/lib/commitment-sync";
import {
  acknowledgeCheckpoint,
  buildCriticalCheckpoints,
  cascadeStatus,
  escalateCheckpoint,
  expireUnacknowledged,
  parseCriticalCommitment,
  parseDeadlinePhrase,
  shouldEscalate,
  type Checkpoint,
} from "@/lib/critical-cascade";
import { cancelCriticalCascade, openMeeting, registerForNotifications, scheduleCommitmentMeeting, scheduleCriticalCascade, speakCheckpointEscalation, speakEagle } from "@/lib/native-services";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { recordTodaySnapshot } from "@/lib/weekly-snapshots";
import { radii } from "@/constants/radii";

type CommitmentStatus = "active" | "completed" | "rescheduled" | "missed";
type RiskState = "stable" | "at_risk" | "rescued" | "missed";
type Priority = "high" | "medium" | "low";

type Commitment = {
  id: string;
  title: string;
  category: string;
  // Tier 3 #11 — was missing entirely; see commitment-parser.ts's
  // ParsedCommitment for the full story of what this fixes.
  scheduledDate: string;
  timeStart: string;
  timeEnd: string;
  priority: Priority;
  status: CommitmentStatus;
  riskState: RiskState;
  critical?: boolean;
  criticalDeadline?: string;
  meetingProvider?: "zoom" | "meet";
  meetingUrl?: string;
  warningMuted?: boolean;
  // Set when a cloud create/update call fails, so the UI can show the user
  // this item hasn't actually synced instead of failing silently.
  syncFailed?: boolean;
  // Tier 1-3 reintegration: local soft-delete-with-undo. Set the moment a
  // delete is requested; the row is hidden everywhere immediately but not
  // actually torn down (notifications, checkpoints, cloud delete) until
  // the undo window elapses - see removeCommitment/finalizeDelete below.
  deletedAt?: string;
};

const STORAGE_KEY = "deagle-commitments-v1";
const CHECKPOINTS_STORAGE_KEY = "deagle-checkpoints-v1";
const ONBOARDING_KEY = "deagle-onboarded-v1";
// Tier 3 #9 — kept to four short slides matching the product's own
// "silence is a feature" instinct: explain the mechanism, not every screen.
const ONBOARDING_SLIDES = [
  { icon: "sparkles-outline" as const, title: "Meet Eagle", body: "Eagle holds your commitments so you don't have to carry them in your head. Capture in plain language — Eagle handles the rest." },
  { icon: "layers-outline" as const, title: "Six a day, on purpose", body: "Only six active commitments at a time. Add a seventh and Eagle suggests the lowest-risk one to move to tomorrow — not a decision you have to make yourself." },
  { icon: "flag-outline" as const, title: "Don't let me forget", body: "Flag something critical and Eagle sets two checkpoints — one day before, three hours before — and escalates with a voice alert if either goes unacknowledged." },
  { icon: "moon-outline" as const, title: "One nightly ritual", body: "Anything unmarked by midnight becomes missed, and Eagle asks if you'd like to carry it to tomorrow. That's the one moment worth not skipping." },
];
const today = new Date();
// NOTE: `today` is computed once at module load, not per-render — a
// pre-existing characteristic of this file, not something Tier 3 #11
// introduces. A session left open across midnight won't roll this over.
// Flagged as a small follow-up in FIXES-LOG.md rather than fixed here,
// since it's a separate concern from the missing date-scoping this fix
// addresses.
const todayKey = today.toISOString().slice(0, 10);
const dateLabel = today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

const initialCommitments: Commitment[] = [
  { id: "1", title: "Send revised proposal to Maya", category: "Work", scheduledDate: todayKey, timeStart: "09:30", timeEnd: "10:00", priority: "high", status: "active", riskState: "stable" },
  { id: "2", title: "Pick up prescription", category: "Health", scheduledDate: todayKey, timeStart: "12:15", timeEnd: "12:45", priority: "medium", status: "active", riskState: "stable" },
  { id: "3", title: "Call Dad about Sunday", category: "People", scheduledDate: todayKey, timeStart: "18:30", timeEnd: "19:00", priority: "high", status: "active", riskState: "at_risk", critical: true },
];

function riskCopy(risk: RiskState) {
  if (risk === "at_risk") return "At risk";
  if (risk === "rescued") return "Rescued";
  if (risk === "missed") return "Missed";
  return "Stable";
}

// Label + color for a critical commitment's checkpoint cascade, shown on Today and in the quick review sheet.
function cascadeCopy(status: ReturnType<typeof cascadeStatus>) {
  if (status === "clear") return { label: "Both checkpoints acknowledged", color: "#0B6E69" };
  if (status === "missed") return { label: "A checkpoint went unacknowledged", color: "#E87561" };
  if (status === "open") return { label: "Checkpoint pending", color: "#F4B942" };
  return { label: "", color: "#E87561" };
}

export default function HomeScreen() {
  const colors = useColors();
  const { width: windowWidth } = useWindowDimensions();
  const isWideWindow = windowWidth >= 720;
  const { isAuthenticated } = useAuth();
  const cloudCommitments = trpc.commitments.list.useQuery(undefined, { enabled: isAuthenticated });
  const createCloudCommitment = trpc.commitments.create.useMutation();
  const updateCloudCommitment = trpc.commitments.update.useMutation();
  const deleteCloudCommitment = trpc.commitments.delete.useMutation();
  const updateLocale = trpc.auth.updateLocale.useMutation();
  const registerPushToken = trpc.notifications.registerToken.useMutation();

  // Tier 3 #12 — registerForNotifications() (lib/native-services.ts) was
  // defined but never actually called anywhere in this file; the whole
  // push-token flow was dead code. Fire-and-forget for the same reason as
  // the locale-report effect above: a failure here just means server-side
  // push stays unavailable for this device until next successful launch,
  // never blocking the user. Local notifications (briefing/review/cascade
  // scheduling elsewhere in this file) work independently of this.
  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") return;
    registerForNotifications().then((token) => {
      if (token) registerPushToken.mutate({ token, platform: Platform.OS as "ios" | "android" });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Tier 2 #5 — reports the device's detected IANA timezone once per
  // session (not on every render/tick) so the server can eventually know
  // "8am local" for this user without relying solely on the device's own
  // clock at notification-scheduling time. Deliberately fire-and-forget:
  // a failure here just means the server's stored timezone stays stale
  // until the next successful launch, which is a fine degradation — it
  // never blocks anything the user is doing.
  useEffect(() => {
    if (!isAuthenticated) return;
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone) updateLocale.mutate({ timezone });
    } catch { /* Intl unavailable on some old engines — non-fatal, just skip. */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
  const upsertCloudSnapshot = trpc.snapshots.upsert.useMutation();
  const [commitments, setCommitments] = useState<Commitment[]>(initialCommitments);
  const [capture, setCapture] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingProvider, setMeetingProvider] = useState<"zoom" | "meet">("zoom");
  const [editMeetingUrl, setEditMeetingUrl] = useState("");
  const [editMeetingProvider, setEditMeetingProvider] = useState<"zoom" | "meet">("zoom");
  const [meetingError, setMeetingError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [chimeMuted, setChimeMuted] = useState(false);
  const [voiceToast, setVoiceToast] = useState("");
  const [syncNotice, setSyncNotice] = useState("");
  const [previousVoiceLink, setPreviousVoiceLink] = useState<{ provider: "zoom" | "meet"; url: string } | null>(null);
  const [editingVoiceLink, setEditingVoiceLink] = useState(false);
  const [meetingFilter, setMeetingFilter] = useState<"all" | "zoom" | "meet">("all");
  const [editWarningMuted, setEditWarningMuted] = useState(false);
  const [showCriticalPrompt, setShowCriticalPrompt] = useState(false);
  const [criticalDeadlineInput, setCriticalDeadlineInput] = useState("");
  const [criticalAmbiguous, setCriticalAmbiguous] = useState(false);
  const [criticalError, setCriticalError] = useState("");
  const [pendingCriticalTitle, setPendingCriticalTitle] = useState<string | null>(null);
  const criticalNotificationIds = useRef<Record<string, string[]>>({});
  // commitment id -> its exactly-two checkpoints (FR-G2/FR-G3 state machine)
  const [checkpoints, setCheckpoints] = useState<Record<string, Checkpoint[]>>({});
  // avoids re-speaking the same checkpoint escalation on every 30s tick
  const escalatedRef = useRef<Set<string>>(new Set());
  const checkpointUpdateCloud = trpc.checkpoints.update.useMutation();
  const [showVoiceEditor, setShowVoiceEditor] = useState(false);
  const [voiceEditUrl, setVoiceEditUrl] = useState("");
  const [voiceEditProvider, setVoiceEditProvider] = useState<"zoom" | "meet">("zoom");
  const chimeMeetingRef = useRef<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [showRescue, setShowRescue] = useState(false);
  const [selected, setSelected] = useState<Commitment | null>(null);
  // Tap-once-to-arm, tap-again-to-confirm delete — avoids a separate modal
  // for a destructive action while still requiring a deliberate second tap.
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  // Tier 3 #9 — a new user previously hit the 6-limit, the cascade, and
  // risk states with zero explanation. Shown once, gated on a local flag;
  // "Show me again" in Settings can reset it (see settings.tsx).
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((seen) => { if (!seen) setShowOnboarding(true); });
  }, []);
  const finishOnboarding = () => { AsyncStorage.setItem(ONBOARDING_KEY, "1"); setShowOnboarding(false); setOnboardingStep(0); };
  const pulse = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    if (!isListening) { pulse.stopAnimation(); pulse.setValue(1); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.14, duration: 650, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [isListening, pulse]);

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript ?? "";
    if (transcript) { setCapture(transcript); const spokenLink = extractMeetingLink(transcript); if (spokenLink) { setPreviousVoiceLink(meetingUrl.trim() ? { provider: meetingProvider, url: meetingUrl } : null); setMeetingProvider(spokenLink.provider); setMeetingUrl(spokenLink.url); setMeetingError(""); setVoiceToast(`${spokenLink.provider === "zoom" ? "Zoom" : "Google Meet"} link detected`); setTimeout(() => setVoiceToast(""), 3600); } }
    if (event.isFinal) setIsListening(false);
  });
  useSpeechRecognitionEvent("error", () => setIsListening(false));

  const toggleVoiceCapture = async () => {
    if (isListening) {
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
      return;
    }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) return;
    setIsListening(true);
    ExpoSpeechRecognitionModule.start({ lang: "en-US", interimResults: true, continuous: false });
  };

  useEffect(() => { setEditMeetingUrl(selected?.meetingUrl ?? ""); setEditMeetingProvider(selected?.meetingProvider ?? "zoom"); setEditWarningMuted(Boolean(selected?.warningMuted)); setMeetingError(""); }, [selected]);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer); }, []);
  useEffect(() => { AsyncStorage.getItem("deagle-meeting-chime-muted").then((value) => setChimeMuted(value === "true")); }, []);
  useEffect(() => {
    if (isAuthenticated && cloudCommitments.data !== undefined) {
      setCommitments((current) => mergeCommitments(current.map((item) => ({ ...item, critical: Boolean(item.critical) })) as any, cloudCommitments.data.map((item) => ({ ...item, critical: Boolean(item.critical) })) as any, suppressedIdsRef.current));
    }
  }, [isAuthenticated, cloudCommitments.data]);

  useEffect(() => {
    readJsonSafely<Commitment[]>(STORAGE_KEY, initialCommitments, (value): value is Commitment[] => Array.isArray(value)).then((result) => {
      setCommitments(result.value);
    });
  }, []);

  // Hydrates locally-scheduled checkpoints so a cascade started before the app
  // was last closed keeps its acknowledge/escalate state across restarts.
  useEffect(() => {
    readJsonSafely<Record<string, Checkpoint[]>>(CHECKPOINTS_STORAGE_KEY, {}, (value): value is Record<string, Checkpoint[]> => typeof value === "object" && value !== null && !Array.isArray(value)).then((result) => {
      setCheckpoints(result.value);
    });
  }, []);
  useEffect(() => { writeJsonSafely(CHECKPOINTS_STORAGE_KEY, checkpoints).catch(() => undefined); }, [checkpoints]);

  // FR-G3: every 30s (reusing the same tick that drives `now` for meeting
  // countdowns) escalate any pending checkpoint past its due time — voice
  // alert, once per checkpoint via escalatedRef — and expire any checkpoint
  // still open once the commitment's own deadline has passed, so the Nightly
  // Review can show the cascade as missed rather than silently open forever.
  useEffect(() => {
    setCheckpoints((all) => {
      let changed = false;
      const next: Record<string, Checkpoint[]> = {};
      for (const [id, list] of Object.entries(all)) {
        const commitment = commitments.find((item) => item.id === id);
        const deadline = commitment?.criticalDeadline;
        next[id] = list.map((checkpoint) => {
          if (shouldEscalate(checkpoint, now)) {
            const key = `${id}:${checkpoint.stage}`;
            if (!escalatedRef.current.has(key)) {
              escalatedRef.current.add(key);
              speakCheckpointEscalation(commitment?.title ?? "A critical commitment", checkpoint.stage);
              // Deliberately not synced to the server here: `id` is the
              // *commitment's* id, not the checkpoint row's own id in the
              // criticalCheckpoints table (the client doesn't track that
              // separately yet — see MERGE-NOTES.md "known gap"). Firing
              // checkpointUpdateCloud with the wrong id risks silently
              // updating an unrelated row. Local state + the voice alert
              // above are correct either way; cloud sync of this specific
              // transition is the tracked follow-up.
            }
            changed = true;
            return escalateCheckpoint(checkpoint);
          }
          if (deadline) {
            const expired = expireUnacknowledged(checkpoint, deadline, now);
            if (expired !== checkpoint) { changed = true; return expired; }
          }
          return checkpoint;
        });
      }
      return changed ? next : all;
    });
  }, [now, commitments, isAuthenticated]);

  useEffect(() => {
    writeJsonSafely(STORAGE_KEY, commitments).catch(() => undefined);
    const snapshotItems = commitments.map((item) => ({ status: item.status, category: item.category, priority: item.priority }));
    recordTodaySnapshot(snapshotItems).catch(() => undefined);
    if (isAuthenticated) { const date = new Date().toISOString().slice(0, 10); const categories = ["All", ...Array.from(new Set(snapshotItems.map((item) => item.category)))]; const priorities = ["all", "high", "medium", "low"]; categories.forEach((category) => priorities.forEach((priority) => { const group = snapshotItems.filter((item) => (category === "All" || item.category === category) && (priority === "all" || item.priority === priority)); const completed = group.filter((item) => item.status === "completed").length; const closed = group.filter((item) => item.status === "completed" || item.status === "missed").length; upsertCloudSnapshot.mutate({ snapshotDate: date, category, priority, completed, closed }); })); }
  }, [commitments, isAuthenticated, upsertCloudSnapshot]);

  const active = useMemo(() => commitments.filter((item) => !item.deletedAt && item.scheduledDate === todayKey && (item.status === "active" || item.status === "rescheduled") && (meetingFilter === "all" || item.meetingProvider === meetingFilter)).sort((a, b) => a.timeStart.localeCompare(b.timeStart)), [commitments, meetingFilter]);
  const completedCount = commitments.filter((item) => item.status === "completed" && !item.deletedAt).length;
  const atRisk = active.find((item) => item.riskState === "at_risk");
  const nextMeeting = useMemo(() => { const item = active.find((candidate) => { if (!candidate.meetingProvider || !candidate.meetingUrl) return false; const [hour, minute] = candidate.timeStart.split(":").map(Number); const target = new Date(); target.setHours(hour, minute, 0, 0); const diff = Math.ceil((target.getTime() - now) / 60000); return diff >= 0 && diff <= 60; }); if (!item) return null; const [hour, minute] = item.timeStart.split(":").map(Number); const target = new Date(); target.setHours(hour, minute, 0, 0); return { ...item, minutesUntil: Math.max(0, Math.ceil((target.getTime() - now) / 60000)) }; }, [active, now]);
  useEffect(() => { if (!chimeMuted && nextMeeting?.minutesUntil === 0 && chimeMeetingRef.current !== nextMeeting.id) { chimeMeetingRef.current = nextMeeting.id; speakEagle("Your meeting is starting now."); } }, [nextMeeting, chimeMuted]);

  const scheduleMeeting = async (provider: "zoom" | "meet") => { const globalMuted = (await AsyncStorage.getItem("deagle-early-warning-muted")) === "true"; if (selected) await scheduleCommitmentMeeting(selected.title, today.toISOString().slice(0, 10), selected.timeStart, provider, selected.meetingUrl, selected.warningMuted ?? globalMuted); };

  // FIX (Tier 1 #1, part A): a newly-captured commitment's local id is a
  // client-side timestamp (see lib/commitment-parser.ts), not the server's
  // real autoincrement row id. Without remapping it once the create call
  // succeeds, every later update() call for that commitment sends the
  // timestamp as if it were the server's id — the WHERE clause matches zero
  // rows, the update silently no-ops, and nothing ever reaches the server
  // for the rest of that session. This closes that gap.
  const remapCommitmentId = (oldId: string, newId: string) => {
    setCommitments((items) => items.map((item) => (item.id === oldId ? { ...item, id: newId, syncFailed: false } : item)));
    setCheckpoints((all) => { if (!(oldId in all)) return all; const { [oldId]: moved, ...rest } = all; return { ...rest, [newId]: moved }; });
    const ids = criticalNotificationIds.current[oldId];
    if (ids) { delete criticalNotificationIds.current[oldId]; criticalNotificationIds.current[newId] = ids; }
  };

  // FIX (Tier 1 #1, part B): every cloud mutation now has an explicit
  // onSuccess/onError instead of firing silently. Failures flip
  // `syncFailed` on the affected commitment (shown as a small badge on its
  // card) and surface a toast, rather than looking identical to a
  // successful save.
  const markSyncFailed = (id: string, message: string) => {
    setCommitments((items) => items.map((item) => (item.id === id ? { ...item, syncFailed: true } : item)));
    setSyncNotice(message);
    setTimeout(() => setSyncNotice(""), 4200);
  };
  const clearSyncFailed = (id: string) => setCommitments((items) => items.map((item) => (item.id === id ? { ...item, syncFailed: false } : item)));

  // Tier 1 #3 — previously a mis-capture could never actually be removed,
  // only reassigned a status. Tears down every piece of state a commitment
  // can be referenced from: local list, checkpoints map, scheduled local
  // notifications, and — if it made it to the server — the cloud row.
  // Tier 3 #10 — ids removed locally this session, so a cloud refetch
  // (which may not yet reflect an in-flight or failed delete) never
  // silently resurrects them. See lib/commitment-sync.ts.
  const suppressedIdsRef = useRef<Set<string>>(new Set());

  // Tier 1-3 reintegration: local soft-delete-with-undo, adapted from the
  // old server-side soft-delete (now dormant per the handoff letter, see
  // MERGE-NOTES.md) to a purely local-first version. Deleting no longer
  // immediately tears everything down - it hides the commitment and starts
  // a short undo window. Only once that window elapses (or a second delete
  // finalizes it early) do notifications get cancelled, checkpoints get
  // dropped, the cloud delete fires, and the row is actually removed.
  // Known limitation: if the app is closed during the undo window, the
  // pending setTimeout never fires and the commitment stays soft-deleted
  // (hidden locally, not yet cloud-deleted) until the next session touches
  // it again - flagged here rather than hidden.
  const UNDO_WINDOW_MS = 6000;
  const [undoNotice, setUndoNotice] = useState<{ id: string; title: string } | null>(null);
  const pendingDeleteRef = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);

  const finalizeDelete = (id: string) => {
    const ids = criticalNotificationIds.current[id];
    if (ids) { cancelCriticalCascade(ids); delete criticalNotificationIds.current[id]; }
    setCheckpoints((all) => { if (!(id in all)) return all; const copy = { ...all }; delete copy[id]; return copy; });
    suppressedIdsRef.current.add(id);
    setCommitments((items) => items.filter((item) => item.id !== id));
    if (isAuthenticated && /^\d+$/.test(id) && id.length < 13) {
      deleteCloudCommitment.mutate({ id: Number(id) }, { onError: () => setSyncNotice("Removed here, but the cloud copy may still exist — worth checking when back online.") });
    }
  };

  const settlePendingDelete = () => {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timer);
      finalizeDelete(pendingDeleteRef.current.id);
      pendingDeleteRef.current = null;
    }
  };

  const removeCommitment = (commitment: Commitment) => {
    settlePendingDelete();
    setCommitments((items) => items.map((item) => (item.id === commitment.id ? { ...item, deletedAt: new Date().toISOString() } : item)));
    const timer = setTimeout(() => {
      finalizeDelete(commitment.id);
      pendingDeleteRef.current = null;
      setUndoNotice((current) => (current?.id === commitment.id ? null : current));
    }, UNDO_WINDOW_MS);
    pendingDeleteRef.current = { id: commitment.id, timer };
    setUndoNotice({ id: commitment.id, title: commitment.title });
    setSelected(null);
  };

  const undoDelete = () => {
    if (!pendingDeleteRef.current) return;
    clearTimeout(pendingDeleteRef.current.timer);
    const id = pendingDeleteRef.current.id;
    pendingDeleteRef.current = null;
    setCommitments((items) => items.map((item) => (item.id === id ? { ...item, deletedAt: undefined } : item)));
    setUndoNotice(null);
  };

  const update = (id: string, patch: Partial<Commitment>) => {
    setCommitments((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
    if (isAuthenticated && /^\d+$/.test(id)) {
      updateCloudCommitment.mutate(
        { id: Number(id), status: patch.status, riskState: patch.riskState, critical: patch.critical, criticalDeadline: "criticalDeadline" in patch ? patch.criticalDeadline ?? null : undefined, meetingProvider: patch.meetingProvider, meetingUrl: patch.meetingUrl, warningMuted: "warningMuted" in patch ? patch.warningMuted ?? null : undefined },
        { onSuccess: () => clearSyncFailed(id), onError: () => markSyncFailed(id, "Couldn't sync that change — Eagle will retry shortly.") }
      );
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Retries any commitment currently marked syncFailed, piggybacking on the
  // existing 30s tick rather than adding another timer. A commitment still
  // on its client-timestamp id (never successfully created server-side)
  // retries the create call; one with a real numeric id retries the update.
  useEffect(() => {
    if (!isAuthenticated) return;
    commitments.filter((item) => item.syncFailed).forEach((item) => {
      if (/^\d+$/.test(item.id) && item.id.length < 13) {
        // Real server id (small autoincrement int, not a 13-digit ms timestamp) — retry update.
        updateCloudCommitment.mutate(
          { id: Number(item.id), status: item.status, riskState: item.riskState, critical: item.critical, criticalDeadline: item.criticalDeadline ?? null, meetingProvider: item.meetingProvider, meetingUrl: item.meetingUrl, warningMuted: item.warningMuted ?? null },
          { onSuccess: () => clearSyncFailed(item.id), onError: () => undefined }
        );
      } else {
        createCloudCommitment.mutate(
          { title: item.title, category: item.category, scheduledDate: new Date().toISOString().slice(0, 10), timeStart: item.timeStart, timeEnd: item.timeEnd, priority: item.priority, status: item.status, riskState: item.riskState, critical: Boolean(item.critical), criticalDeadline: item.criticalDeadline, meetingProvider: item.meetingProvider, meetingUrl: item.meetingUrl },
          { onSuccess: (serverId) => remapCommitmentId(item.id, String(serverId)), onError: () => undefined }
        );
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, isAuthenticated]);

  const commitCritical = (deadline: Date, titleOverride?: string) => {
    // Named distinctly from the `checkpoints` state above — this is just the
    // two rows for *this* commitment, not the whole id-keyed map.
    const builtCheckpoints = buildCriticalCheckpoints(deadline);
    const title = titleOverride ?? pendingCriticalTitle;
    if (title !== null && title !== undefined) {
      const parsed = parseCommitment(title);
      const next: Commitment = { ...parsed, critical: true, criticalDeadline: deadline.toISOString() };
      setCommitments((items) => [...items, next]);
      if (isAuthenticated) createCloudCommitment.mutate(
        { title: next.title, category: next.category, scheduledDate: new Date().toISOString().slice(0, 10), timeStart: next.timeStart, timeEnd: next.timeEnd, priority: next.priority, status: next.status, riskState: next.riskState, critical: true, criticalDeadline: deadline.toISOString() },
        { onSuccess: (serverId) => remapCommitmentId(next.id, String(serverId)), onError: () => markSyncFailed(next.id, "Couldn't save this to the cloud yet — Eagle will retry.") }
      );
      setCheckpoints((all) => ({ ...all, [next.id]: builtCheckpoints }));
      scheduleCriticalCascade(next.id, next.title, builtCheckpoints).then((ids) => { criticalNotificationIds.current[next.id] = ids; });
      setPendingCriticalTitle(null);
    } else if (selected) {
      update(selected.id, { critical: true, criticalDeadline: deadline.toISOString() });
      setCheckpoints((all) => ({ ...all, [selected.id]: builtCheckpoints }));
      scheduleCriticalCascade(selected.id, selected.title, builtCheckpoints).then((ids) => { criticalNotificationIds.current[selected.id] = ids; });
      setSelected(null);
    }
    setShowCriticalPrompt(false);
    setCriticalDeadlineInput("");
    setCriticalAmbiguous(false);
    setCriticalError("");
  };

  // FR-G3: marks one of a commitment's two checkpoints acknowledged, from the commitment detail sheet.
  const acknowledgeCommitmentCheckpoint = (commitment: Commitment, stage: Checkpoint["stage"]) => {
    setCheckpoints((all) => {
      const list = all[commitment.id];
      if (!list) return all;
      return { ...all, [commitment.id]: list.map((checkpoint) => (checkpoint.stage === stage ? acknowledgeCheckpoint(checkpoint) : checkpoint)) };
    });
    // Same known gap as the escalation tick above: the client only tracks
    // checkpoints by commitment id locally, not by their own server row id,
    // so there's no correct id to sync this acknowledgment to yet. Updating
    // local state (above) is what actually silences future escalation and
    // is correct regardless of server sync. `checkpointUpdateCloud` is kept
    // as a named mutation, ready to wire in once checkpoint row ids are
    // tracked client-side (see MERGE-NOTES.md "known gap").
    void checkpointUpdateCloud;
  };

  const addCommitment = () => {
    if (!capture.trim()) return;
    if (/don'?t let me forget/i.test(capture)) {
      const result = parseCriticalCommitment(capture);
      if (result.ambiguous || !result.deadline) {
        setPendingCriticalTitle(result.title);
        setCriticalDeadlineInput("");
        setCriticalAmbiguous(true);
        setCriticalError("");
        setShowCriticalPrompt(true);
        setCapture("");
        return;
      }
      commitCritical(result.deadline, result.title);
      setCapture("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }
    if (active.length >= 6) {
      setShowRescue(true);
      return;
    }
    const extracted = extractMeetingLink(capture); const link = meetingUrl.trim() ? { provider: meetingProvider, url: normalizeMeetingUrl(meetingUrl) } : extracted; const linkError = link ? validateMeetingUrl(link.url, link.provider) : null; if (linkError) { setMeetingError(linkError); return; } const parsed = parseCommitment(capture); const next = { ...parsed, meetingProvider: link?.provider, meetingUrl: link?.url }; setCommitments((items) => [...items, next]);
    if (isAuthenticated) createCloudCommitment.mutate(
      { title: next.title, category: next.category, scheduledDate: new Date().toISOString().slice(0, 10), timeStart: next.timeStart, timeEnd: next.timeEnd, priority: next.priority, status: next.status, riskState: next.riskState, critical: false, meetingProvider: meetingUrl.trim() ? meetingProvider : undefined, meetingUrl: meetingUrl.trim() || undefined },
      { onSuccess: (serverId) => remapCommitmentId(next.id, String(serverId)), onError: () => markSyncFailed(next.id, "Couldn't save this to the cloud yet — Eagle will retry.") }
    );
    setCapture("");
    setMeetingUrl("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const moveMissedToTomorrow = () => {
    setCommitments((items) => items.map((item) => item.status === "missed" ? { ...item, status: "rescheduled", riskState: "rescued" } : item));
    setShowReview(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScreenContainer className="px-5" containerClassName="bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>D-EAGLE HUB</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Good morning, Alex.</Text>
            <Text style={[styles.date, { color: colors.muted }]}>{dateLabel}</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}><Text style={styles.avatarText}>A</Text></View>
        </View>

        <View style={[styles.briefCard, { backgroundColor: colors.foreground }]}>
          <View style={styles.briefTop}><View><Text style={styles.briefKicker}>MORNING BRIEFING</Text><Text style={styles.briefTitle}>Your day, held.</Text></View><Ionicons name="sparkles" size={24} color="#F4B942" /></View>
          <Text style={styles.briefBody}>{active.length} commitments on deck. I'll surface the one that needs you most.</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(8, (completedCount / Math.max(commitments.length, 1)) * 100)}%` }]} /></View>
          <View style={styles.briefMeta}><Text style={styles.briefMetaText}>{completedCount} closed</Text><Text style={styles.briefMetaText}>{Math.max(active.length, 0)} remaining</Text></View>
        </View>

        {nextMeeting && <Pressable onPress={() => openMeeting(nextMeeting.meetingProvider!, nextMeeting.meetingUrl)} style={({ pressed }) => [styles.quickJoin, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Ionicons name="videocam" size={18} color="#FFFFFF" /><View style={styles.quickJoinCopy}><Text style={styles.quickJoinTitle}>Join {nextMeeting.meetingProvider === "zoom" ? "Zoom" : "Google Meet"} soon</Text><Text style={styles.quickJoinBody}>{nextMeeting.title} | {nextMeeting.minutesUntil === 0 ? "starting now" : `starts in ${nextMeeting.minutesUntil} min`} | {nextMeeting.timeStart}</Text></View><Ionicons name="arrow-forward" size={17} color="#FFFFFF" /></Pressable>}

        {atRisk && <Pressable onPress={() => { setSelected(atRisk); speakEagle(`${atRisk.title} starts at ${atRisk.timeStart}.`); }} style={({ pressed }) => [styles.rescueBanner, { backgroundColor: "#FFF4D9", borderColor: "#F4B942" }, pressed && styles.pressed]}>
          <View style={[styles.riskDot, { backgroundColor: "#F4B942" }]} /><View style={styles.rescueText}><Text style={[styles.rescueTitle, { color: colors.foreground }]}>Eagle has a read on this one</Text><Text style={[styles.rescueBody, { color: colors.muted }]}>{atRisk.title} tends to slip after 6 PM. Want a rescue plan?</Text></View><Ionicons name="chevron-forward" size={19} color={colors.foreground} />
        </Pressable>}

        <View style={styles.sectionHeader}><View><Text style={[styles.sectionTitle, { color: colors.foreground }]}>On your radar</Text><Text style={[styles.sectionSub, { color: colors.muted }]}>Six is the ceiling. Clarity is the goal.</Text></View><View style={styles.headingMeta}>{meetingFilter !== "all" && <View style={[styles.filterBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.filterBadgeText, { color: colors.primary }]}>{meetingFilter === "zoom" ? "Zoom only" : "Google Meet only"}</Text><Pressable onPress={() => setMeetingFilter("all")} accessibilityLabel="Clear meeting filter"><Ionicons name="close-circle" size={15} color={colors.primary} /></Pressable></View>}<Text style={[styles.count, { color: colors.primary }]}>{active.length}/6</Text></View></View><View style={styles.meetingLegend}><Text style={[styles.legendLabel, { color: colors.muted }]}>MEETING LINKS</Text><Pressable onPress={() => setMeetingFilter(meetingFilter === "zoom" ? "all" : "zoom")} style={[styles.legendItem, meetingFilter === "zoom" && styles.legendActive]}><Ionicons name="videocam-outline" size={14} color="#2D8CFF" /><Text style={[styles.legendText, { color: colors.muted }]}>Zoom</Text></Pressable><Pressable onPress={() => setMeetingFilter(meetingFilter === "meet" ? "all" : "meet")} style={[styles.legendItem, meetingFilter === "meet" && styles.legendActive]}><Ionicons name="videocam-outline" size={14} color="#0B6E69" /><Text style={[styles.legendText, { color: colors.muted }]}>Google Meet</Text></Pressable>{meetingFilter !== "all" && <Pressable onPress={() => setMeetingFilter("all")}><Text style={[styles.legendClear, { color: colors.primary }]}>Clear</Text></Pressable>}</View>

        <View style={styles.timeline}>
          {active.map((item, index) => <Pressable key={item.id} onPress={() => { setSelected(item); setDeleteConfirmId(null); }} style={({ pressed }) => [styles.commitmentRow, pressed && styles.pressed]}>
            <View style={styles.timeCol}><Text style={[styles.time, { color: colors.foreground }]}>{item.timeStart}</Text><Text style={[styles.timeEnd, { color: colors.muted }]}>{item.timeEnd}</Text></View>
            <View style={[styles.timelineLine, { backgroundColor: colors.border }]}><View style={[styles.timelineDot, { backgroundColor: item.riskState === "at_risk" ? "#F4B942" : colors.primary }]} /></View>
            <View style={[styles.commitmentCard, { backgroundColor: colors.surface, borderColor: item.riskState === "at_risk" ? "#F4B942" : colors.border }]}>
              <View style={styles.cardTop}><View style={styles.categoryPill}><Text style={[styles.categoryText, { color: colors.primary }]}>{item.category}</Text></View><View style={styles.cardIcons}>{item.warningMuted === false && <Ionicons name="alarm-outline" size={14} color={colors.primary} />}{item.meetingUrl && <Pressable {...({ title: item.meetingProvider === "zoom" ? "Zoom meeting" : "Google Meet meeting" } as any)} accessibilityLabel={item.meetingProvider === "zoom" ? "Zoom meeting link saved" : "Google Meet meeting link saved"}><Ionicons name="videocam-outline" size={15} color={colors.primary} /></Pressable>}{item.critical && <Ionicons name="flag" size={14} color={cascadeCopy(cascadeStatus(checkpoints[item.id] ?? [])).color} />}{item.syncFailed && <Ionicons name="cloud-offline-outline" size={14} color="#E87561" accessibilityLabel="Not yet synced — Eagle will retry" />}</View></View>
              <Text style={[styles.commitmentTitle, { color: colors.foreground }]}>{item.title}</Text>
              {item.critical && cascadeCopy(cascadeStatus(checkpoints[item.id] ?? [])).label ? <Text style={{ fontSize: 10, fontWeight: "700", marginTop: 6, color: cascadeCopy(cascadeStatus(checkpoints[item.id] ?? [])).color }}>{cascadeCopy(cascadeStatus(checkpoints[item.id] ?? [])).label}</Text> : null}
              <View style={styles.cardBottom}><View style={styles.riskWrap}><View style={[styles.smallDot, { backgroundColor: item.riskState === "at_risk" ? "#F4B942" : colors.primary }]} /><Text style={[styles.riskText, { color: item.riskState === "at_risk" ? "#9B6A00" : colors.muted }]}>{riskCopy(item.riskState)}</Text></View><Text style={[styles.priority, { color: item.priority === "high" ? "#E87561" : colors.muted }]}>{item.priority} priority</Text></View>
            </View>
          </Pressable>)}
          {isAuthenticated && cloudCommitments.isLoading && commitments.length === 0 && <View style={styles.empty}><ActivityIndicator color={colors.primary} /><Text style={[styles.emptyBody, { color: colors.muted, marginTop: 10 }]}>Loading today...</Text></View>}
          {!(isAuthenticated && cloudCommitments.isLoading && commitments.length === 0) && active.length === 0 && <View style={styles.empty}><Ionicons name="moon-outline" size={28} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your radar is clear.</Text><Text style={[styles.emptyBody, { color: colors.muted }]}>Capture what matters, then let Eagle hold it.</Text></View>}
        </View>

        <View style={[styles.captureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.captureIcon}><Ionicons name="add" size={22} color="#FFFFFF" /></View>
          <TextInput value={capture} onChangeText={setCapture} onSubmitEditing={addCommitment} returnKeyType="done" placeholder="What do you need to hold?" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.foreground }]} />
          <Animated.View style={{ transform: [{ scale: pulse }] }}><Pressable onPress={toggleVoiceCapture} accessibilityLabel={isListening ? "Stop listening" : "Start voice capture"} style={({ pressed }) => [styles.micButton, { backgroundColor: isListening ? "#E87561" : colors.border }, pressed && styles.pressed]}><Ionicons name={isListening ? "stop" : "mic"} size={17} color={isListening ? "#FFFFFF" : colors.foreground} /></Pressable></Animated.View><Pressable onPress={addCommitment} disabled={!capture.trim() || createCloudCommitment.isPending} style={({ pressed }) => [styles.sendButton, { backgroundColor: capture.trim() ? colors.primary : colors.border }, pressed && styles.pressed]}>{createCloudCommitment.isPending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="arrow-up" size={18} color="#FFFFFF" />}</Pressable>
        </View>
        <View style={styles.meetingCapture}><View style={styles.providerRow}><Pressable onPress={() => setMeetingProvider("zoom")} style={[styles.providerChip, { backgroundColor: meetingProvider === "zoom" ? "#2D8CFF" : colors.border }]}><Text style={styles.providerText}>Zoom</Text></Pressable><Pressable onPress={() => setMeetingProvider("meet")} style={[styles.providerChip, { backgroundColor: meetingProvider === "meet" ? "#0B6E69" : colors.border }]}><Text style={styles.providerText}>Google Meet</Text></Pressable></View><TextInput value={meetingUrl} onChangeText={(value) => { setMeetingUrl(value); setMeetingError(""); }} onEndEditing={() => setMeetingUrl(normalizeMeetingUrl(meetingUrl))} autoCapitalize="none" keyboardType="url" placeholder={editingVoiceLink ? "Edit detected meeting URL" : "Optional meeting URL for this task"} placeholderTextColor={colors.muted} style={[styles.meetingInput, { color: colors.foreground, borderColor: meetingError ? "#E87561" : colors.border }]} />{meetingError ? <Text style={styles.meetingError}>{meetingError}</Text> : null}</View><Text style={[styles.captureHint, { color: colors.muted }]}>Try "Call Mum tomorrow at 7 pm"</Text>

        <Pressable onPress={() => setShowReview(true)} style={({ pressed }) => [styles.reviewLink, pressed && styles.pressed]}><Ionicons name="moon" size={17} color={colors.primary} /><Text style={[styles.reviewText, { color: colors.primary }]}>Open tonight's review</Text><Ionicons name="arrow-forward" size={16} color={colors.primary} /></Pressable>
      </ScrollView>

      {voiceToast ? <View style={[styles.voiceToast, { backgroundColor: colors.foreground }]}><Ionicons name="checkmark-circle" size={16} color="#F4B942" /><Text style={styles.voiceToastText}>{voiceToast}</Text><Pressable onPress={() => { setVoiceEditUrl(meetingUrl); setVoiceEditProvider(meetingProvider); setShowVoiceEditor(true); setVoiceToast(""); }}><Text style={styles.voiceUndo}>Edit</Text></Pressable><Pressable onPress={() => { if (previousVoiceLink) { setMeetingProvider(previousVoiceLink.provider); setMeetingUrl(previousVoiceLink.url); } else { setMeetingProvider("zoom"); setMeetingUrl(""); } setPreviousVoiceLink(null); setVoiceToast(""); setEditingVoiceLink(false); }}><Text style={styles.voiceUndo}>Undo</Text></Pressable></View> : null}
      {syncNotice ? <View style={[styles.voiceToast, { backgroundColor: "#E87561", bottom: voiceToast ? 138 : 82 }]}><Ionicons name="cloud-offline-outline" size={16} color="#FFFFFF" /><Text style={styles.voiceToastText}>{syncNotice}</Text></View> : null}
      {undoNotice ? <View style={[styles.voiceToast, { backgroundColor: colors.foreground, bottom: voiceToast && syncNotice ? 194 : ((voiceToast || syncNotice) ? 138 : 82) }]}><Ionicons name="trash-outline" size={16} color="#F4B942" /><Text style={styles.voiceToastText}>Deleted "{undoNotice.title}"</Text><Pressable onPress={undoDelete}><Text style={styles.voiceUndo}>Undo</Text></Pressable></View> : null}

      <Modal visible={showVoiceEditor} transparent animationType="fade" onRequestClose={() => setShowVoiceEditor(false)}><View style={styles.modalBackdrop}><View style={[styles.voiceEditor, { backgroundColor: colors.background }, isWideWindow ? styles.wideSheet : null]}><Text style={[styles.sheetEyebrow, { color: colors.primary }]}>EDIT DETECTED LINK</Text><Text style={[styles.voiceEditorTitle, { color: colors.foreground }]}>Check the meeting URL</Text><View style={styles.providerRow}><Pressable onPress={() => setVoiceEditProvider("zoom")} style={[styles.providerChip, { backgroundColor: voiceEditProvider === "zoom" ? "#2D8CFF" : colors.border }]}><Text style={styles.providerText}>Zoom</Text></Pressable><Pressable onPress={() => setVoiceEditProvider("meet")} style={[styles.providerChip, { backgroundColor: voiceEditProvider === "meet" ? "#0B6E69" : colors.border }]}><Text style={styles.providerText}>Google Meet</Text></Pressable></View><TextInput value={voiceEditUrl} onChangeText={setVoiceEditUrl} autoCapitalize="none" keyboardType="url" style={[styles.meetingInput, { color: colors.foreground, borderColor: colors.border }]} placeholder="Paste the corrected URL" placeholderTextColor={colors.muted} /><View style={styles.voiceEditorActions}><Pressable onPress={() => { const normalized = normalizeMeetingUrl(voiceEditUrl); const error = validateMeetingUrl(normalized, voiceEditProvider); if (error) { setMeetingError(error); return; } setMeetingProvider(voiceEditProvider); setMeetingUrl(normalized); setMeetingError(""); setEditingVoiceLink(false); setShowVoiceEditor(false); }} style={[styles.saveMeeting, { backgroundColor: colors.primary }]}><Text style={styles.saveMeetingText}>Use corrected link</Text></Pressable><Pressable onPress={() => setShowVoiceEditor(false)} style={[styles.removeMeeting, { borderColor: colors.border }]}><Text style={[styles.removeMeetingText, { color: colors.foreground }]}>Cancel</Text></Pressable></View></View></View></Modal>

      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}><View style={[styles.sheet, { backgroundColor: colors.background }, isWideWindow ? styles.wideSheet : null]}>
          {selected && <><View style={styles.sheetHandle} /><Text style={[styles.sheetEyebrow, { color: colors.primary }]}>{selected.category.toUpperCase()} | {selected.timeStart}</Text><Text style={[styles.sheetTitle, { color: colors.foreground }]}>{selected.title}</Text><Text style={[styles.sheetBody, { color: colors.muted }]}>This commitment is {riskCopy(selected.riskState).toLowerCase()}. Eagle will keep an eye on it without adding noise.</Text>
            <View style={styles.sheetActions}><Pressable onPress={() => { update(selected.id, { status: "completed", riskState: "stable" }); setSelected(null); }} style={({ pressed }) => [styles.primaryAction, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Ionicons name="checkmark" size={18} color="#FFFFFF" /><Text style={styles.primaryActionText}>Complete</Text></Pressable><Pressable onPress={() => { update(selected.id, { status: "rescheduled", riskState: "rescued" }); setSelected(null); }} style={({ pressed }) => [styles.secondaryAction, { borderColor: colors.border }, pressed && styles.pressed]}><Text style={[styles.secondaryActionText, { color: colors.foreground }]}>Defer</Text></Pressable></View>
            <Text style={[styles.meetingEditLabel, { color: colors.muted }]}>MEETING DETAILS</Text><View style={styles.providerRow}><Pressable onPress={() => setEditMeetingProvider("zoom")} style={[styles.providerChip, { backgroundColor: editMeetingProvider === "zoom" ? "#2D8CFF" : colors.border }]}><Text style={styles.providerText}>Zoom</Text></Pressable><Pressable onPress={() => setEditMeetingProvider("meet")} style={[styles.providerChip, { backgroundColor: editMeetingProvider === "meet" ? "#0B6E69" : colors.border }]}><Text style={styles.providerText}>Google Meet</Text></Pressable></View><TextInput value={editMeetingUrl} onChangeText={(value) => { setEditMeetingUrl(value); setMeetingError(""); }} onEndEditing={() => setEditMeetingUrl(normalizeMeetingUrl(editMeetingUrl))} autoCapitalize="none" keyboardType="url" placeholder="Paste a meeting URL" placeholderTextColor={colors.muted} style={[styles.meetingInput, { color: colors.foreground, borderColor: meetingError ? "#E87561" : colors.border }]} />{meetingError ? <Text style={styles.meetingError}>{meetingError}</Text> : null}<View style={styles.meetingEditActions}><Pressable onPress={() => { const error = validateMeetingUrl(editMeetingUrl, editMeetingProvider); if (error) { setMeetingError(error); return; } update(selected.id, { meetingProvider: editMeetingUrl.trim() ? editMeetingProvider : undefined, meetingUrl: editMeetingUrl.trim() || undefined, warningMuted: editWarningMuted }); setSelected({ ...selected, meetingProvider: editMeetingProvider, meetingUrl: editMeetingUrl.trim() || undefined, warningMuted: editWarningMuted }); }} style={[styles.saveMeeting, { backgroundColor: colors.primary }]}><Text style={styles.saveMeetingText}>Save meeting link</Text></Pressable><Pressable onPress={() => { update(selected.id, { meetingProvider: undefined, meetingUrl: undefined }); setEditMeetingUrl(""); }} style={[styles.removeMeeting, { borderColor: colors.border }]}><Text style={[styles.removeMeetingText, { color: colors.foreground }]}>Remove</Text></Pressable></View><View style={styles.warningOverride}><Text style={[styles.warningOverrideLabel, { color: colors.muted }]}>Five-minute warning for this meeting</Text><Switch value={!editWarningMuted} onValueChange={(value: boolean) => setEditWarningMuted(!value)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#FFFFFF" /></View><View style={styles.meetingActions}><Pressable onPress={() => openMeeting("zoom", selected.meetingUrl)} style={[styles.meetingButton, { borderColor: colors.border }]}><Ionicons name="videocam" size={16} color="#2D8CFF" /><Text style={[styles.meetingText, { color: colors.foreground }]}>Open Zoom</Text></Pressable><Pressable onPress={() => openMeeting("meet", selected.meetingUrl)} style={[styles.meetingButton, { borderColor: colors.border }]}><Ionicons name="videocam" size={16} color="#0B6E69" /><Text style={[styles.meetingText, { color: colors.foreground }]}>Open Meet</Text></Pressable></View><View style={styles.meetingSchedule}><Pressable onPress={() => scheduleMeeting("zoom")}><Text style={styles.scheduleText}>Schedule Zoom at {selected.timeStart}</Text></Pressable><Pressable onPress={() => scheduleMeeting("meet")}><Text style={styles.scheduleText}>Schedule Meet at {selected.timeStart}</Text></Pressable></View><Pressable onPress={() => { if (selected.critical) { const ids = criticalNotificationIds.current[selected.id]; if (ids) { cancelCriticalCascade(ids); delete criticalNotificationIds.current[selected.id]; } setCheckpoints((all) => { const copy = { ...all }; delete copy[selected.id]; return copy; }); update(selected.id, { critical: false, criticalDeadline: undefined }); setSelected(null); } else { setPendingCriticalTitle(null); setCriticalDeadlineInput(""); setCriticalAmbiguous(false); setCriticalError(""); setShowCriticalPrompt(true); } }} style={styles.flagAction}><Ionicons name={selected.critical ? "flag" : "flag-outline"} size={17} color="#E87561" /><Text style={styles.flagText}>{selected.critical ? "Remove critical flag" : "Don't let me forget this"}</Text></Pressable>
            <Pressable onPress={() => { if (deleteConfirmId === selected.id) { removeCommitment(selected); setDeleteConfirmId(null); } else { setDeleteConfirmId(selected.id); } }} style={[styles.flagAction, { marginTop: 4 }]}><Ionicons name="trash-outline" size={16} color={colors.muted} /><Text style={[styles.flagText, { color: colors.muted }]}>{deleteConfirmId === selected.id ? "Tap again to delete (undoable for a few seconds)" : "Delete this commitment"}</Text></Pressable>
            {selected.critical && selected.criticalDeadline && <Text style={[styles.criticalMeta, { color: colors.muted }]}>Two checkpoints set | deadline {new Date(selected.criticalDeadline).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Text>}
            {selected.critical && <View style={{ marginTop: 8 }}>
              {(checkpoints[selected.id] ?? []).map((checkpoint) => <View key={checkpoint.stage} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 }}>
                <View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground }}>{checkpoint.stage === "day_before" ? "1 day before" : "3 hours before"}</Text>
                  <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>{checkpoint.status === "acknowledged" ? "Acknowledged" : checkpoint.status === "escalated" ? "Escalated | voice alert sent" : checkpoint.status === "missed" ? "Missed" : "Pending"}</Text>
                </View>
                {checkpoint.status !== "acknowledged" && checkpoint.status !== "missed" && <Pressable onPress={() => acknowledgeCommitmentCheckpoint(selected, checkpoint.stage)} style={[styles.removeMeeting, { borderColor: colors.border, paddingVertical: 6, paddingHorizontal: 12 }]}><Text style={[styles.removeMeetingText, { color: colors.primary }]}>Acknowledge</Text></Pressable>}
              </View>)}
              {(checkpoints[selected.id]?.length ?? 0) === 0 && <Text style={{ fontSize: 12, color: colors.muted }}>Checkpoints will be scheduled the moment this is flagged critical.</Text>}
            </View>}
          </>}
        </View></View>
      </Modal>

      <Modal visible={showReview} transparent animationType="slide" onRequestClose={() => setShowReview(false)}><View style={styles.modalBackdrop}><View style={[styles.sheet, { backgroundColor: colors.background }, isWideWindow ? styles.wideSheet : null]}><View style={styles.sheetHandle} /><Text style={[styles.sheetEyebrow, { color: colors.primary }]}>NIGHTLY REVIEW | 10:00 PM</Text><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Let's close the loop.</Text><Text style={[styles.sheetBody, { color: colors.muted }]}>Anything still open at midnight becomes missed. You can move missed commitments to tomorrow with one tap.</Text><View style={styles.reviewBuckets}><ReviewBucket label="Completed" count={completedCount} icon="checkmark-circle" color="#0B6E69" colors={colors} /><ReviewBucket label="Rescheduled" count={commitments.filter((i) => i.status === "rescheduled" && !i.deletedAt).length} icon="time" color="#F4B942" colors={colors} /><ReviewBucket label="Missed" count={commitments.filter((i) => i.status === "missed" && !i.deletedAt).length} icon="close-circle" color="#E87561" colors={colors} /></View>
              {commitments.some((item) => item.critical && !item.deletedAt) && <View style={{ marginBottom: 18 }}>
                <Text style={[styles.meetingEditLabel, { color: colors.muted }]}>CRITICAL CHECKPOINTS</Text>
                {commitments.filter((item) => item.critical && !item.deletedAt).map((item) => { const status = cascadeCopy(cascadeStatus(checkpoints[item.id] ?? [])); return <View key={item.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}><Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground, flex: 1, marginRight: 10 }}>{item.title}</Text><Text style={{ fontSize: 11, fontWeight: "800", color: status.color }}>{status.label || "Scheduling..."}</Text></View>; })}
              </View>}
              <Pressable onPress={moveMissedToTomorrow} style={({ pressed }) => [styles.primaryAction, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.primaryActionText}>Yes, move missed to tomorrow</Text></Pressable><Pressable onPress={() => setShowReview(false)} style={styles.laterAction}><Text style={[styles.laterText, { color: colors.muted }]}>I'll review the list</Text></Pressable></View></View></Modal>

      <Modal visible={showRescue} transparent animationType="slide" onRequestClose={() => setShowRescue(false)}><View style={styles.modalBackdrop}><View style={[styles.sheet, { backgroundColor: colors.background }, isWideWindow ? styles.wideSheet : null]}><View style={styles.sheetHandle} /><Text style={[styles.sheetEyebrow, { color: "#E87561" }]}>SIX-COMMITMENT CEILING</Text><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Your day is full by design.</Text><Text style={[styles.sheetBody, { color: colors.muted }]}>Eagle found the lowest-impact commitment to move instead of making you choose what to drop.</Text><View style={[styles.swapCard, { backgroundColor: colors.surface, borderColor: colors.border }]}><Text style={[styles.swapLabel, { color: colors.muted }]}>SUGGESTED TO MOVE</Text><Text style={[styles.swapTitle, { color: colors.foreground }]}>{active[active.length - 1]?.title ?? "No commitment"}</Text><Text style={[styles.swapReason, { color: colors.muted }]}>Stable history | lowest rescue impact</Text></View><Pressable onPress={() => { if (active.length) update(active[active.length - 1].id, { status: "rescheduled", riskState: "rescued" }); setShowRescue(false); }} style={({ pressed }) => [styles.primaryAction, { backgroundColor: colors.primary }, pressed && styles.pressed]}><Text style={styles.primaryActionText}>Confirm swap</Text></Pressable><Pressable onPress={() => setShowRescue(false)} style={styles.laterAction}><Text style={[styles.laterText, { color: colors.muted }]}>Keep tomorrow full</Text></Pressable></View></View></Modal>
      <Modal visible={showOnboarding} transparent animationType="fade" onRequestClose={finishOnboarding}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.voiceEditor, { backgroundColor: colors.background }, isWideWindow ? styles.wideSheet : null]}>
            <View style={{ flexDirection: "row", justifyContent: "center", marginBottom: 14 }}><Ionicons name={ONBOARDING_SLIDES[onboardingStep].icon} size={30} color={colors.primary} /></View>
            <Text style={[styles.voiceEditorTitle, { color: colors.foreground, textAlign: "center" }]}>{ONBOARDING_SLIDES[onboardingStep].title}</Text>
            <Text style={[styles.sheetBody, { color: colors.muted, textAlign: "center", marginTop: 8, marginBottom: 18 }]}>{ONBOARDING_SLIDES[onboardingStep].body}</Text>
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 18 }}>{ONBOARDING_SLIDES.map((_, i) => <View key={i} style={{ width: i === onboardingStep ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === onboardingStep ? colors.primary : colors.border }} />)}</View>
            <View style={styles.voiceEditorActions}>
              {onboardingStep < ONBOARDING_SLIDES.length - 1 ? <>
                <Pressable onPress={() => setOnboardingStep((step) => step + 1)} style={[styles.saveMeeting, { backgroundColor: colors.primary }]}><Text style={styles.saveMeetingText}>Next</Text></Pressable>
                <Pressable onPress={finishOnboarding} style={[styles.removeMeeting, { borderColor: colors.border }]}><Text style={[styles.removeMeetingText, { color: colors.foreground }]}>Skip</Text></Pressable>
              </> : <Pressable onPress={finishOnboarding} style={[styles.saveMeeting, { backgroundColor: colors.primary, flex: 1 }]}><Text style={styles.saveMeetingText}>Got it</Text></Pressable>}
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showCriticalPrompt} transparent animationType="fade" onRequestClose={() => { setShowCriticalPrompt(false); setPendingCriticalTitle(null); }}><View style={styles.modalBackdrop}><View style={[styles.voiceEditor, { backgroundColor: colors.background }, isWideWindow ? styles.wideSheet : null]}><Text style={[styles.sheetEyebrow, { color: "#E87561" }]}>DON'T LET ME FORGET</Text><Text style={[styles.voiceEditorTitle, { color: colors.foreground }]}>{criticalAmbiguous ? "What time is the deadline?" : "Before when?"}</Text><Text style={[styles.sheetBody, { color: colors.muted, marginTop: 0, marginBottom: 14 }]}>{criticalAmbiguous ? "Eagle needs one clear time to set the two checkpoints." : "Eagle will set exactly two checkpoints: one day before, and three hours before."}</Text><TextInput value={criticalDeadlineInput} onChangeText={(value) => { setCriticalDeadlineInput(value); setCriticalError(""); }} autoCapitalize="none" placeholder={criticalAmbiguous ? "e.g. 5pm tomorrow" : "e.g. before 5pm tomorrow"} placeholderTextColor={colors.muted} style={[styles.meetingInput, { color: colors.foreground, borderColor: criticalError ? "#E87561" : colors.border }]} />{criticalError ? <Text style={styles.meetingError}>{criticalError}</Text> : null}<View style={styles.voiceEditorActions}><Pressable onPress={() => { const phrase = criticalAmbiguous ? `before ${criticalDeadlineInput}` : criticalDeadlineInput; const result = parseDeadlinePhrase(phrase); if (result.ambiguous || !result.deadline) { setCriticalAmbiguous(true); setCriticalError("Give Eagle one specific time, like 5pm or 5pm tomorrow."); return; } commitCritical(result.deadline); }} style={[styles.saveMeeting, { backgroundColor: colors.primary }]}><Text style={styles.saveMeetingText}>Set two checkpoints</Text></Pressable><Pressable onPress={() => { setShowCriticalPrompt(false); setPendingCriticalTitle(null); }} style={[styles.removeMeeting, { borderColor: colors.border }]}><Text style={[styles.removeMeetingText, { color: colors.foreground }]}>Cancel</Text></Pressable></View></View></View></Modal>
    </ScreenContainer>
  );
}

function ReviewBucket({ label, count, icon, color, colors }: { label: string; count: number; icon: keyof typeof Ionicons.glyphMap; color: string; colors: ReturnType<typeof useColors> }) {
  return <View style={[styles.bucket, { backgroundColor: colors.surface, borderColor: colors.border }]}><Ionicons name={icon} size={20} color={color} /><Text style={[styles.bucketCount, { color: colors.foreground }]}>{count}</Text><Text style={[styles.bucketLabel, { color: colors.muted }]}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  content: { paddingTop: 22, paddingBottom: 42 }, header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }, eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 2.2, marginBottom: 7 }, title: { fontSize: 27, fontWeight: "700", letterSpacing: -0.7 }, date: { fontSize: 14, marginTop: 5 }, avatar: { width: 42, height: 42, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" }, avatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 }, briefCard: { borderRadius: radii.sheet, padding: 20, marginBottom: 15 }, briefTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }, briefKicker: { color: "#B5CAC6", fontSize: 10, letterSpacing: 1.5, fontWeight: "800", marginBottom: 8 }, briefTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "700" }, briefBody: { color: "#C8D7D4", fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 280 }, progressTrack: { height: 6, backgroundColor: "#36504D", borderRadius: 3, marginTop: 19, overflow: "hidden" }, progressFill: { height: 6, backgroundColor: "#F4B942", borderRadius: 3 }, briefMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: 9 }, briefMetaText: { color: "#B5CAC6", fontSize: 12 }, rescueBanner: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: radii.card, borderWidth: 1, marginBottom: 23 }, riskDot: { width: 10, height: 10, borderRadius: 5, marginRight: 11 }, rescueText: { flex: 1 }, rescueTitle: { fontSize: 14, fontWeight: "700", marginBottom: 3 }, rescueBody: { fontSize: 12, lineHeight: 17 }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }, headingMeta: { flexDirection: "row", alignItems: "center", gap: 8 }, filterBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 }, filterBadgeText: { fontSize: 10, fontWeight: "800" }, sectionTitle: { fontSize: 19, fontWeight: "700" }, sectionSub: { fontSize: 12, marginTop: 4 }, count: { fontSize: 13, fontWeight: "800" }, timeline: { gap: 12 }, commitmentRow: { flexDirection: "row", minHeight: 92 }, timeCol: { width: 52, paddingTop: 11 }, time: { fontSize: 13, fontWeight: "700" }, timeEnd: { fontSize: 11, marginTop: 4 }, timelineLine: { width: 1, marginHorizontal: 10, position: "relative" }, timelineDot: { position: "absolute", width: 9, height: 9, borderRadius: 5, left: -4, top: 15 }, commitmentCard: { flex: 1, borderWidth: 1, borderRadius: radii.card, padding: 13 },   cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, cardIcons: { flexDirection: "row", alignItems: "center", gap: 8 }, categoryPill: { backgroundColor: "#DDEDEA", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 4 }, categoryText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 }, commitmentTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20, marginTop: 9 }, cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 }, riskWrap: { flexDirection: "row", alignItems: "center" }, smallDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 }, riskText: { fontSize: 11, fontWeight: "600" }, priority: { fontSize: 11 }, empty: { alignItems: "center", paddingVertical: 32 }, emptyTitle: { fontSize: 16, fontWeight: "700", marginTop: 10 }, emptyBody: { fontSize: 13, marginTop: 5 }, captureCard: { flexDirection: "row", alignItems: "center", borderRadius: radii.card, borderWidth: 1, padding: 8, marginTop: 20 }, captureIcon: { width: 34, height: 34, borderRadius: radii.chip, backgroundColor: "#0B6E69", alignItems: "center", justifyContent: "center" }, input: { flex: 1, fontSize: 14, paddingHorizontal: 11, height: 40 }, sendButton: { width: 34, height: 34, borderRadius: radii.chip, alignItems: "center", justifyContent: "center" },   captureHint: { fontSize: 11, marginTop: 7, marginLeft: 12 },   voiceToast: { position: "absolute", bottom: 82, alignSelf: "center", zIndex: 3, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radii.card, flexDirection: "row", alignItems: "center", gap: 7 }, voiceToastText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" }, voiceEditor: { width: "92%", alignSelf: "center", borderRadius: radii.sheet, padding: 20 }, voiceEditorTitle: { fontSize: 20, fontWeight: "700", marginBottom: 14 }, voiceEditorActions: { flexDirection: "row", gap: 8, marginTop: 12 }, voiceUndo: { color: "#F4B942", fontSize: 12, fontWeight: "800", marginLeft: 6 }, meetingLegend: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }, legendItem: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 5, borderRadius: 7 }, legendActive: { backgroundColor: "#E5EFEC" }, legendClear: { fontSize: 10, fontWeight: "800" }, legendLabel: { fontSize: 9, fontWeight: "800", letterSpacing: 1.1, marginRight: 2 }, legendText: { fontSize: 11 }, warningOverride: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }, warningOverrideLabel: { fontSize: 12, fontWeight: "600" }, quickJoin: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, padding: 14, marginBottom: 16 }, quickJoinCopy: { flex: 1 }, quickJoinTitle: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" }, quickJoinBody: { color: "#D8EFEB", fontSize: 11, marginTop: 3 }, meetingEditLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.3, marginTop: 20, marginBottom: 8 }, meetingEditActions: { flexDirection: "row", gap: 8, marginTop: 9 }, saveMeeting: { flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: "center" }, saveMeetingText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" }, removeMeeting: { borderWidth: 1, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center" }, removeMeetingText: { fontSize: 11, fontWeight: "700" }, meetingCapture: { marginTop: 10 }, providerRow: { flexDirection: "row", gap: 8, marginLeft: 2, marginBottom: 8 }, providerChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12 }, providerText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },   meetingInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 40, fontSize: 13 }, meetingError: { color: "#C94F3B", fontSize: 11, marginTop: 5, marginLeft: 2 }, micButton: { width: 34, height: 34, borderRadius: radii.chip, alignItems: "center", justifyContent: "center", marginRight: 6 }, reviewLink: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 23 }, reviewText: { fontWeight: "700", fontSize: 13 }, pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] }, modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(16,36,42,0.46)" }, sheet: { borderTopLeftRadius: radii.sheet + 4, borderTopRightRadius: radii.sheet + 4, padding: 22, paddingBottom: 34 }, sheetHandle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: "#CBD5D3", marginBottom: 22 }, sheetEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 8 }, sheetTitle: { fontSize: 27, fontWeight: "700", letterSpacing: -0.5 }, sheetBody: { fontSize: 14, lineHeight: 21, marginTop: 12 }, sheetActions: { flexDirection: "row", gap: 10, marginTop: 24 }, primaryAction: { flex: 1, minHeight: 50, borderRadius: radii.chip + 3, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8 }, primaryActionText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 }, secondaryAction: { flex: 0.55, minHeight: 50, borderRadius: radii.chip + 3, alignItems: "center", justifyContent: "center", borderWidth: 1 }, secondaryActionText: { fontWeight: "700", fontSize: 14 }, flagAction: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20, paddingVertical: 10 }, flagText: { color: "#E87561", fontSize: 13, fontWeight: "700" }, criticalMeta: { textAlign: "center", fontSize: 11, marginTop: -6, marginBottom: 4 }, reviewBuckets: { flexDirection: "row", gap: 9, marginTop: 22, marginBottom: 22 }, bucket: { flex: 1, minHeight: 103, borderRadius: radii.chip + 3, borderWidth: 1, padding: 12 }, bucketCount: { fontSize: 25, fontWeight: "700", marginTop: 9 }, bucketLabel: { fontSize: 11, marginTop: 2 },   meetingActions: { flexDirection: "row", gap: 9, marginTop: 18 }, meetingButton: { flex: 1, minHeight: 43, borderWidth: 1, borderRadius: radii.chip, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, meetingText: { fontSize: 12, fontWeight: "700" }, meetingSchedule: { flexDirection: "row", justifyContent: "space-between", marginTop: 13 }, scheduleText: { color: "#0B6E69", fontSize: 11, fontWeight: "700" }, laterAction: { alignItems: "center", paddingVertical: 16 }, laterText: { fontSize: 13, fontWeight: "600" }, swapCard: { borderWidth: 1, borderRadius: radii.card, padding: 15, marginTop: 22, marginBottom: 22 }, swapLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4 }, swapTitle: { fontSize: 17, fontWeight: "700", marginTop: 8 }, swapReason: { fontSize: 12, marginTop: 5 }, wideSheet: { width: "100%", maxWidth: 560, alignSelf: "center" },
});




