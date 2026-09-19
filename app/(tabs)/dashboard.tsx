import { useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@/lib/secure-storage";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { DailySnapshot, getRollingWeekSnapshots } from "@/lib/weekly-snapshots";
import { radii } from "@/constants/radii";
import { spacing } from "@/constants/spacing";
import { typography } from "@/constants/typography";

const QUOTES = ["Small promises, kept consistently, become momentum.", "Clarity is a kindness to your future self.", "One honest finish is worth ten perfect plans."];
const THEMES = { Signal: { ink: "#10242A", gold: "#F4B942", pale: "#F5F1E7" }, Dawn: { ink: "#513B5C", gold: "#F59E9B", pale: "#FFF1EF" }, Grove: { ink: "#163B35", gold: "#A7D7B8", pale: "#EFF8F1" } };

type ThemeName = keyof typeof THEMES;
export default function DashboardScreen() {
  const colors = useColors(); const { width: windowWidth } = useWindowDimensions(); const isWideWindow = windowWidth >= 720; const { isAuthenticated } = useAuth(); const cloud = trpc.snapshots.list.useQuery(undefined, { enabled: isAuthenticated }); const generateQuote = trpc.quotes.generate.useMutation();
  const [local, setLocal] = useState<DailySnapshot[]>([]); const [category, setCategory] = useState("All"); const [priority, setPriority] = useState("all"); const [range, setRange] = useState(7); const [quote, setQuote] = useState(QUOTES[0]); const [theme, setTheme] = useState<ThemeName>("Signal"); const [zoom, setZoom] = useState(1); const [sharing, setSharing] = useState(false); const [shared, setShared] = useState(false); const [previewUri, setPreviewUri] = useState<string | null>(null); const shareCard = useRef<View>(null); const [shareError, setShareError] = useState("");
  useEffect(() => { getRollingWeekSnapshots().then(setLocal).catch(() => undefined); AsyncStorage.getItem("deagle-share-theme").then((saved) => { if (saved && saved in THEMES) setTheme(saved as ThemeName); }); }, []); useEffect(() => { AsyncStorage.setItem("deagle-share-theme", theme).catch(() => undefined); }, [theme]);
  const snapshots = useMemo(() => cloud.data?.length ? cloud.data.map((x) => ({ date: x.snapshotDate, category: x.category, priority: x.priority ?? "all", completed: x.completed, closed: x.closed, rate: x.closed ? Math.round((x.completed / x.closed) * 100) : 0 })) : local, [cloud.data, local]);
  const categories = useMemo(() => ["All", ...Array.from(new Set(snapshots.filter((x) => x.category !== "All").map((x) => x.category)))], [snapshots]);
  const filtered = useMemo(() => snapshots.filter((x) => (category === "All" || x.category === category) && (priority === "all" || x.priority === priority)), [snapshots, category, priority]);
  const days = useMemo(() => { const now = new Date(); return Array.from({ length: range }, (_, index) => { const date = new Date(now); date.setHours(0, 0, 0, 0); date.setDate(now.getDate() - (range - 1 - index)); const key = date.toISOString().slice(0, 10); return filtered.find((x) => x.date === key) ?? { date: key, category, priority, completed: 0, closed: 0, rate: 0 }; }); }, [filtered, category, priority, range]);
  const totals = useMemo(() => days.reduce((a, x) => ({ completed: a.completed + x.completed, closed: a.closed + x.closed }), { completed: 0, closed: 0 }), [days]); const rate = totals.closed ? Math.round((totals.completed / totals.closed) * 100) : 0;
  const breakdown = useMemo(() => ["high", "medium", "low"].map((level) => { const rows = snapshots.filter((x) => (category === "All" || x.category === category) && x.priority === level); const completed = rows.reduce((sum, x) => sum + x.completed, 0); const closed = rows.reduce((sum, x) => sum + x.closed, 0); return { level, completed, closed, rate: closed ? Math.round(completed / closed * 100) : 0 }; }), [snapshots, category]);
  const topCategory = useMemo(() => { const totalsByCategory = snapshots.filter((x) => x.category !== "All").reduce<Record<string, number>>((acc, x) => { acc[x.category] = (acc[x.category] ?? 0) + x.completed; return acc; }, {}); return Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "steady progress"; }, [snapshots]);
  const palette = THEMES[theme];
  const generatePersonalQuote = async () => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  };
  const generatePreview = async () => { setSharing(true); try { if (shareCard.current) { const uri = await captureRef(shareCard, { format: "png", quality: 1, result: "tmpfile" }); setPreviewUri(uri); } } finally { setSharing(false); } };
  const confirmShare = async () => {
    if (!previewUri) return;
    try {
      if (Platform.OS === "web") {
        // expo-sharing and RN's Share.share() aren't implemented for file
        // images on web -- this silently did nothing before. Download the
        // captured PNG directly instead.
        const link = document.createElement("a");
        link.href = previewUri;
        link.download = "eagle-weekly-signal.png";
        link.click();
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(previewUri, { mimeType: "image/png", dialogTitle: "Share your Eagle weekly signal" });
      } else {
        await Share.share({ title: "My Eagle weekly signal", message: `${rate}% completion | Top category: ${topCategory}` });
      }
      setPreviewUri(null);
      setShared(true);
      setTimeout(() => setShared(false), 2600);
    } catch {
      Alert.alert("Share failed", "Couldn't share or save the image. Try again.");
    }
  };
  return <ScreenContainer className="px-5" containerClassName="bg-background"><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}><View ref={shareCard} collapsable={false} style={[styles.shareCanvas, { backgroundColor: palette.pale }]}><View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>WEEKLY SIGNAL</Text><Text style={[styles.title, { color: colors.foreground }]}>Your follow-through.</Text></View><Pressable accessibilityLabel="Preview weekly progress image" disabled={sharing} onPress={generatePreview} style={[styles.shareButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>{sharing ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="share-outline" size={19} color={colors.primary} />}</Pressable></View><Text style={[styles.subtitle, { color: colors.muted }]}>A quiet look back at what you carried to the finish line.</Text><Text style={[styles.filterLabel, { color: colors.muted }]}>CATEGORY</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>{categories.map((item) => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.filter, { backgroundColor: category === item ? colors.primary : colors.surface, borderColor: colors.border }]}><Text style={{ color: category === item ? "#FFF" : colors.muted, fontSize: 12, fontWeight: "700" }}>{item}</Text></Pressable>)}</ScrollView><Text style={[styles.filterLabel, { color: colors.muted }]}>PRIORITY</Text><View style={styles.row}>{["all", "high", "medium", "low"].map((item) => <Pressable key={item} onPress={() => setPriority(item)} style={[styles.filter, { backgroundColor: priority === item ? colors.primary : colors.surface, borderColor: colors.border }]}><Text style={{ color: priority === item ? "#FFF" : colors.muted, fontSize: 12, fontWeight: "700" }}>{item === "all" ? "All" : item[0].toUpperCase() + item.slice(1)}</Text></Pressable>)}</View><Text style={[styles.filterLabel, { color: colors.muted }]}>DATE RANGE</Text><View style={styles.row}>{[7, 14, 30].map((item) => <Pressable key={item} onPress={() => setRange(item)} style={[styles.filter, { backgroundColor: range === item ? colors.primary : colors.surface, borderColor: colors.border }]}><Text style={{ color: range === item ? "#FFF" : colors.muted, fontSize: 12, fontWeight: "700" }}>{item} days</Text></Pressable>)}</View><View style={[styles.hero, { backgroundColor: palette.ink }]}><View style={styles.heroTop}><View><Text style={styles.heroLabel}>{category.toUpperCase()} | LAST {range} DAYS</Text><Text style={styles.heroNumber}>{rate}%</Text></View><View style={[styles.heroIcon, { backgroundColor: palette.gold }]}><Ionicons name="trending-up" size={23} color={palette.ink} /></View></View><Text style={styles.heroBody}>{totals.closed ? `${totals.completed} of ${totals.closed} closed commitments completed.` : "Complete a commitment and Eagle will start your signal."}</Text><Text style={[styles.heroQuote, { color: palette.gold }]}>"{quote}"</Text><Text style={styles.heroBody}>Top completed category: {topCategory}</Text><View style={styles.heroTrack}><View style={[styles.heroFill, { width: `${Math.max(rate, 3)}%`, backgroundColor: palette.gold }]} /></View></View></View><View style={styles.chartHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Completion rate</Text><Text style={[styles.sectionMeta, { color: colors.muted }]}>{range} days</Text></View><View style={[styles.chart, { backgroundColor: colors.surface, borderColor: colors.border }]}><View style={styles.bars}>{days.map((day, index) => <View key={day.date} style={styles.barGroup}><View style={styles.barTrack}><View style={[styles.bar, { height: `${Math.max(day.rate, 4)}%`, backgroundColor: index === days.length - 1 ? colors.primary : "#C9D8D5" }]} /></View><Text style={[styles.barLabel, { color: colors.muted }]}>{new Date(`${day.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2)}</Text></View>)}</View></View><View style={styles.chartHeader}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>Priority breakdown</Text><Text style={[styles.sectionMeta, { color: colors.muted }]}>Completed rate</Text></View><View style={[styles.breakdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>{breakdown.map((item) => <View key={item.level} style={styles.breakRow}><Text style={[styles.level, { color: colors.foreground }]}>{item.level[0].toUpperCase() + item.level.slice(1)}</Text><View style={styles.breakTrack}><View style={[styles.breakFill, { width: `${Math.max(item.rate, 2)}%`, backgroundColor: item.level === "high" ? "#E87561" : item.level === "medium" ? "#F4B942" : colors.primary }]} /></View><Text style={[styles.breakRate, { color: colors.muted }]}>{item.rate}%</Text></View>)}</View><Text style={[styles.shareHint, { color: colors.muted }]}>Tap share to preview and export this branded Signal card.</Text></ScrollView>{shared && <View style={[styles.toast, { backgroundColor: palette.ink }]}><Ionicons name="checkmark-circle" size={17} color={palette.gold} /><Text style={styles.toastText}>Progress image shared</Text></View>}{shareError ? <View style={[styles.toast, { backgroundColor: "#C94F3B", bottom: shared ? 138 : 82 }]}><Ionicons name="alert-circle" size={17} color="#FFFFFF" /><Text style={styles.toastText}>{shareError}</Text></View> : null}<Modal visible={!!previewUri} transparent animationType="slide" onRequestClose={() => setPreviewUri(null)}><View style={styles.modalBackdrop}><View style={[styles.modalCard, { backgroundColor: colors.background }, isWideWindow ? styles.wideSheet : null]}><View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: colors.foreground }]}>Preview your Signal</Text><Pressable onPress={() => setPreviewUri(null)}><Ionicons name="close" size={22} color={colors.muted} /></Pressable></View>{previewUri && <View style={[styles.previewFrame, { transform: [{ scale: zoom }] }]}><Text style={[styles.previewBrand, { color: palette.ink }]}>D|EAGLE HUB</Text><Text style={[styles.previewRate, { color: palette.ink }]}>{rate}%</Text><Text style={[styles.previewCopy, { color: palette.ink }]}>Top category: {topCategory}</Text><Text style={[styles.previewQuote, { color: palette.ink }]}>"{quote}"</Text><View style={[styles.previewStripe, { backgroundColor: palette.gold }]} /></View>}<View style={styles.zoomRow}><Text style={[styles.filterLabel, { color: colors.muted, marginTop: 0 }]}>PREVIEW ZOOM</Text><Pressable onPress={() => setZoom((value) => Math.max(0.8, Number((value - 0.1).toFixed(1))))} style={styles.zoomButton}><Ionicons name="remove" size={16} color={colors.foreground} /></Pressable><Text style={[styles.zoomValue, { color: colors.muted }]}>{Math.round(zoom * 100)}%</Text><Pressable onPress={() => setZoom((value) => Math.min(1.4, Number((value + 0.1).toFixed(1))))} style={styles.zoomButton}><Ionicons name="add" size={16} color={colors.foreground} /></Pressable></View><Text style={[styles.filterLabel, { color: colors.muted }]}>QUOTE</Text><View style={styles.quoteActions}><Pressable onPress={generatePersonalQuote} disabled={generateQuote.isPending} style={[styles.aiButton, { backgroundColor: colors.primary }]}><Ionicons name="sparkles" size={15} color="#FFF" /><Text style={styles.aiText}>{generateQuote.isPending ? "Writing..." : "Generate with Eagle AI"}</Text></Pressable></View><TextInput value={quote} onChangeText={setQuote} maxLength={100} style={[styles.quoteInput, { color: colors.foreground, borderColor: colors.border }]} /><Text style={[styles.filterLabel, { color: colors.muted }]}>THEME</Text><View style={styles.row}>{(Object.keys(THEMES) as ThemeName[]).map((item) => <Pressable key={item} onPress={() => setTheme(item)} style={[styles.filter, { backgroundColor: theme === item ? THEMES[item].ink : colors.surface, borderColor: colors.border }]}><Text style={{ color: theme === item ? "#FFF" : colors.muted, fontSize: 12, fontWeight: "700" }}>{item}</Text></Pressable>)}</View><Pressable onPress={confirmShare} style={[styles.confirm, { backgroundColor: colors.primary }]}><Text style={styles.confirmText}>Confirm & Share Image</Text></Pressable></View></View></Modal></ScreenContainer>;
}
const styles = StyleSheet.create({
  content: { paddingTop: spacing.xxl, paddingBottom: spacing.huge },
  shareCanvas: { paddingBottom: spacing.xs },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eyebrow: { ...typography.eyebrow, marginBottom: spacing.sm },
  title: { ...typography.display },
  subtitle: { ...typography.body, marginTop: spacing.sm, marginBottom: spacing.lg },
  shareButton: { width: 42, height: 42, borderRadius: radii.chip, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  filterLabel: { ...typography.label, marginTop: spacing.sm, marginBottom: spacing.sm },
  filters: { gap: spacing.sm, paddingBottom: spacing.xs },
  row: { flexDirection: "row", gap: spacing.sm, paddingBottom: spacing.xs },
  filter: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, borderWidth: 1 },
  hero: { borderRadius: radii.card, padding: spacing.xl, marginTop: spacing.md, marginBottom: spacing.xxl },
  heroTop: { flexDirection: "row", justifyContent: "space-between" },
  heroLabel: { ...typography.label, color: "#B5CAC6" },
  heroNumber: { color: "#FFF", fontSize: 42, lineHeight: 49, fontWeight: "700", marginTop: spacing.sm },
  heroIcon: { width: 43, height: 43, borderRadius: radii.card, alignItems: "center", justifyContent: "center" },
  heroBody: { ...typography.bodySmall, color: "#C8D7D4", marginTop: spacing.md },
  heroQuote: { ...typography.bodySmall, marginTop: spacing.md, fontStyle: "italic" },
  heroTrack: { height: 6, backgroundColor: "#36504D", borderRadius: 3, marginTop: spacing.lg, overflow: "hidden" },
  heroFill: { height: 6, borderRadius: 3 },
  chartHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  sectionTitle: { ...typography.subtitle, fontWeight: "700" },
  sectionMeta: { ...typography.caption },
  chart: { height: 214, borderRadius: radii.card, borderWidth: 1, padding: spacing.lg, marginBottom: spacing.xxl },
  bars: { flex: 1, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.sm },
  barGroup: { flex: 1, height: "100%", alignItems: "center", justifyContent: "flex-end" },
  barTrack: { height: "82%", width: "72%", justifyContent: "flex-end", backgroundColor: "#F0F4F2", borderRadius: radii.chip, overflow: "hidden" },
  bar: { width: "100%", borderRadius: radii.chip, minHeight: 7 },
  barLabel: { ...typography.caption, fontWeight: "700", marginTop: spacing.sm },
  breakdown: { borderRadius: radii.card, borderWidth: 1, padding: spacing.lg, gap: spacing.lg },
  breakRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  level: { width: 57, ...typography.caption, fontWeight: "700" },
  breakTrack: { flex: 1, height: 9, borderRadius: 5, backgroundColor: "#EDF2F0", overflow: "hidden" },
  breakFill: { height: "100%", borderRadius: 5 },
  breakRate: { width: 36, textAlign: "right", ...typography.caption, fontWeight: "700" },
  shareHint: { textAlign: "center", ...typography.caption, marginTop: spacing.md },
  toast: { position: "absolute", bottom: 82, alignSelf: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radii.card, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  toastText: { color: "#FFF", ...typography.caption, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(15,27,30,.56)", justifyContent: "flex-end" },
  modalCard: { borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, padding: spacing.xxl, paddingBottom: spacing.xxxl },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.lg },
  modalTitle: { ...typography.title },
  previewFrame: { height: 160, borderRadius: radii.card, backgroundColor: "#F5F1E7", padding: spacing.lg, marginBottom: spacing.lg, overflow: "hidden" },
  previewBrand: { ...typography.eyebrow },
  previewRate: { fontSize: 40, fontWeight: "800", marginTop: spacing.xl },
  previewCopy: { ...typography.caption, marginTop: spacing.xs },
  previewQuote: { ...typography.caption, fontStyle: "italic", marginTop: spacing.sm },
  previewStripe: { position: "absolute", left: 0, right: 0, bottom: 0, height: 8 },
  quoteInput: { borderWidth: 1, borderRadius: radii.chip, paddingHorizontal: spacing.md, paddingVertical: spacing.md, ...typography.body, marginBottom: spacing.sm },
  confirm: { alignItems: "center", borderRadius: radii.chip + 3, paddingVertical: spacing.lg, marginTop: spacing.lg },
  confirmText: { color: "#FFF", fontWeight: "800" },
  zoomRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  zoomButton: { width: 28, height: 28, borderRadius: radii.chip, borderWidth: 1, borderColor: "#D7E0DE", alignItems: "center", justifyContent: "center" },
  zoomValue: { width: 42, textAlign: "center", ...typography.caption, fontWeight: "700" },
  quoteActions: { flexDirection: "row", marginBottom: spacing.sm },
  aiButton: { borderRadius: radii.chip, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  aiText: { color: "#FFF", ...typography.caption, fontWeight: "800" },
  wideSheet: { width: "100%", maxWidth: 560, alignSelf: "center" },
});






