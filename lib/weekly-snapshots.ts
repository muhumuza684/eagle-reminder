import AsyncStorage from "@/lib/secure-storage";

export type SnapshotInput = { status: string; category: string; priority?: string };
export type DailySnapshot = { date: string; category: string; priority: string; completed: number; closed: number; rate: number };
export const WEEKLY_SNAPSHOT_KEY = "deagle-weekly-snapshots-v1";

export function buildSnapshot(date: string, statuses: string[], category = "All", priority = "all"): DailySnapshot { const completed = statuses.filter((status) => status === "completed").length; const closed = statuses.filter((status) => status === "completed" || status === "missed").length; return { date, category, priority, completed, closed, rate: closed ? Math.round((completed / closed) * 100) : 0 }; }

export async function recordTodaySnapshot(items: SnapshotInput[], date = new Date().toISOString().slice(0, 10)) { const existing = await AsyncStorage.getItem(WEEKLY_SNAPSHOT_KEY); const snapshots: DailySnapshot[] = existing ? JSON.parse(existing) : []; const groups = ["All", ...Array.from(new Set(items.map((item) => item.category)))]; const next = groups.map((category) => buildSnapshot(date, (category === "All" ? items : items.filter((item) => item.category === category)).map((item) => item.status), category)); const merged = [...snapshots.filter((snapshot) => !(snapshot.date === date && groups.includes(snapshot.category))), ...next].sort((a, b) => a.date.localeCompare(b.date)).slice(-210); await AsyncStorage.setItem(WEEKLY_SNAPSHOT_KEY, JSON.stringify(merged)); return merged; }

export async function getRollingWeekSnapshots(date = new Date(), category = "All") { const existing = await AsyncStorage.getItem(WEEKLY_SNAPSHOT_KEY); const snapshots: DailySnapshot[] = existing ? JSON.parse(existing) : []; return Array.from({ length: 7 }, (_, index) => { const day = new Date(date); day.setHours(0, 0, 0, 0); day.setDate(date.getDate() - (6 - index)); const key = day.toISOString().slice(0, 10); return snapshots.find((snapshot) => snapshot.date === key && snapshot.category === category) ?? { date: key, category, priority: "all", completed: 0, closed: 0, rate: 0 }; }); }

