import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { readJsonSafely, writeJsonSafely } from "@/lib/safe-json";
import { parseCommitment } from "@/lib/commitment-parser";
import { createClientId } from "@/lib/identity";
import { cancelReminder, scheduleReminder } from "@/lib/native-services";
import { nextScheduledDate, needsRegeneration } from "@/lib/recurrence";
import { isOpen, localDateKey, whenOf, type Commitment } from "@/lib/commitment";
import { formatHHMM } from "@/lib/format";
import type { RingtoneKey } from "@/lib/preferences-defaults";

const STORAGE_KEY = "deagle-commitments-v1";
const REMINDERS_KEY = "deagle-reminders-v1";
// Sample items an earlier version seeded on first launch; they are cleaned out of saved data.
const LEGACY_IDS = new Set(["1", "2", "3"]);
const LEGACY_TITLES = new Set(["Send revised proposal to Maya", "Pick up prescription", "Call Dad about Sunday"]);

// One scheduled reminder per open commitment. The ids survive restarts.
let reminderIds: Record<string, string> = {};
const saveIds = () => {
  writeJsonSafely(REMINDERS_KEY, reminderIds).catch(() => undefined);
};

async function applyReminder(item: Commitment, tone: RingtoneKey) {
  const existing = reminderIds[item.id];
  if (existing) {
    delete reminderIds[item.id];
    await cancelReminder(existing);
  }
  if (isOpen(item)) {
    const when = whenOf(item);
    if (when) {
      const scheduled = await scheduleReminder(item.id, item.title, when, tone);
      if (scheduled) reminderIds[item.id] = scheduled;
    }
  }
  saveIds();
}

const byWhen = (a: Commitment, b: Commitment) => (whenOf(a)?.getTime() ?? 0) - (whenOf(b)?.getTime() ?? 0);

export function useReminders(tone: RingtoneKey) {
  const [items, setItems] = useState<Commitment[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [removed, setRemoved] = useState<Commitment | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const toneRef = useRef(tone);
  toneRef.current = tone;
  const lastTone = useRef(tone);

  const open = useMemo(() => items.filter(isOpen).sort(byWhen), [items]);
  const cur = open.find((item) => item.id === selectedId) ?? open[0] ?? null;

  // Load what was saved, then schedule every open reminder again.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await readJsonSafely<Record<string, string>>(
        REMINDERS_KEY,
        {},
        (value): value is Record<string, string> => typeof value === "object" && value !== null && !Array.isArray(value),
      );
      reminderIds = stored.value;
      const saved = await readJsonSafely<Commitment[]>(STORAGE_KEY, [], (value): value is Commitment[] => Array.isArray(value));
      if (cancelled) return;
      const clean = saved.value.filter((item) => !(LEGACY_IDS.has(item.id) && LEGACY_TITLES.has(item.title)));
      setItems(clean);
      setHydrated(true);
      clean.forEach((item) => {
        applyReminder(item, toneRef.current).catch(() => undefined);
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Saving waits a moment so the encrypted write does not run on every small change.
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => {
      writeJsonSafely(STORAGE_KEY, items).catch(() => undefined);
    }, 300);
    return () => clearTimeout(timer);
  }, [items, hydrated]);

  // A new ringtone applies to everything already scheduled.
  useEffect(() => {
    if (lastTone.current === tone) return;
    lastTone.current = tone;
    if (!hydrated) return;
    itemsRef.current.filter(isOpen).forEach((item) => {
      applyReminder(item, tone).catch(() => undefined);
    });
  }, [tone, hydrated]);

  // Repeating reminders: once one is finished, create the next occurrence.
  useEffect(() => {
    if (!hydrated) return;
    const todayKey = localDateKey(new Date());
    const sources = items.filter((item) => needsRegeneration(item, todayKey));
    if (sources.length === 0) return;
    const ids = new Set(sources.map((item) => item.id));
    const fresh: Commitment[] = sources.map((source) => ({
      ...source,
      id: createClientId(),
      scheduledDate: nextScheduledDate(source.scheduledDate, source.recurrence!),
      status: "active" as const,
      riskState: "stable" as const,
      deletedAt: undefined,
    }));
    setItems((all) => [...all.map((item) => (ids.has(item.id) ? { ...item, recurrence: "none" as const } : item)), ...fresh]);
    fresh.forEach((item) => {
      applyReminder(item, toneRef.current).catch(() => undefined);
    });
  }, [items, hydrated]);

  // Clear the "removed" undo offer after a few seconds.
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), 6000);
    return () => clearTimeout(timer);
  }, [removed]);

  const update = useCallback((id: string, patch: Partial<Commitment>) => {
    const current = itemsRef.current.find((item) => item.id === id);
    setItems((all) => all.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    if (current) applyReminder({ ...current, ...patch }, toneRef.current).catch(() => undefined);
  }, []);

  /** Adds a reminder. `when` overrides whatever time the words themselves carried. */
  const add = useCallback((text: string, when: Date | null): Commitment => {
    const { explicit: _explicit, ...base } = parseCommitment(text.trim() || "Reminder");
    const next: Commitment = { ...base };
    if (when) {
      next.scheduledDate = localDateKey(when);
      next.timeStart = formatHHMM(when);
      next.timeEnd = formatHHMM(new Date(when.getTime() + 30 * 60000));
    }
    setItems((all) => [...all, next]);
    applyReminder(next, toneRef.current).catch(() => undefined);
    return next;
  }, []);

  const done = useCallback((id: string) => update(id, { status: "completed", riskState: "stable" }), [update]);

  const snooze = useCallback(
    (id: string, minutes = 10) => {
      const later = new Date(Date.now() + minutes * 60000);
      update(id, {
        status: "active",
        scheduledDate: localDateKey(later),
        timeStart: formatHHMM(later),
        timeEnd: formatHHMM(new Date(later.getTime() + 30 * 60000)),
      });
    },
    [update],
  );

  const remove = useCallback((id: string) => {
    const item = itemsRef.current.find((entry) => entry.id === id);
    if (!item) return;
    setItems((all) => all.filter((entry) => entry.id !== id));
    applyReminder({ ...item, deletedAt: new Date().toISOString() }, toneRef.current).catch(() => undefined);
    setRemoved(item);
  }, []);

  const undo = useCallback(() => {
    const item = removed;
    if (!item) return;
    setRemoved(null);
    setItems((all) => [...all, item]);
    applyReminder(item, toneRef.current).catch(() => undefined);
  }, [removed]);

  return { open, cur, select: setSelectedId, add, done, snooze, remove, undo, removed, hydrated };
}
