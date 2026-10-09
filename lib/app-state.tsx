import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Vibration } from "react-native";
import { useReminders } from "@/hooks/use-reminders";
import { whenOf } from "@/lib/commitment";
import { HORN, RINGTONES, playSound, stopSound } from "@/lib/sound";
import { useTheme } from "@/lib/theme";

type Ringing = { id: string | null; title: string; demo: boolean };
type Toast = { text: string; undo?: boolean };

type AppValue = {
  reminders: ReturnType<typeof useReminders>;
  ringing: Ringing | null;
  demoUntil: number | null;
  toast: Toast | null;
  flash: (text: string) => void;
  dismissToast: () => void;
  startPreview: () => void;
  answer: (snooze: boolean) => void;
};

const AppContext = createContext<AppValue | null>(null);

export function useApp(): AppValue {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp must be used inside AppProvider");
  return value;
}

/**
 * Everything that must keep working on every screen: the reminders, the moment one comes due
 * (the ringing card), the motion preview and the little toast messages.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const { prefs } = useTheme();
  const reminders = useReminders();
  const [ringing, setRinging] = useState<Ringing | null>(null);
  const [demoUntil, setDemoUntil] = useState<number | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const curRef = useRef(reminders.cur);
  curRef.current = reminders.cur;
  const demoRef = useRef(demoUntil);
  demoRef.current = demoUntil;
  const ringingRef = useRef(ringing);
  ringingRef.current = ringing;

  const flash = useCallback((text: string) => setToast({ text }), []);
  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.undo ? 6000 : 2600);
    return () => clearTimeout(id);
  }, [toast]);

  // Removing a reminder offers an Undo.
  useEffect(() => {
    if (reminders.removed) setToast({ text: `Removed “${reminders.removed.title}”`, undo: true });
  }, [reminders.removed]);

  // The moment a reminder (or the preview) comes due, the card appears, on whatever screen you are on.
  useEffect(() => {
    const id = setInterval(() => {
      if (ringingRef.current) return;
      const t = Date.now();
      const cur = curRef.current;
      if (demoRef.current != null) {
        if (t >= demoRef.current) setRinging({ id: null, title: cur?.title ?? "Preview", demo: true });
        return;
      }
      const due = cur ? whenOf(cur) : null;
      if (cur && due && due.getTime() <= t) setRinging({ id: cur.id, title: cur.title, demo: false });
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Ring until answered: the chime repeats, louder each time, with a buzz.
  useEffect(() => {
    if (!ringing) return;
    const source = prefs.scene === "express" ? HORN : RINGTONES[prefs.ringtone].source;
    let count = 0;
    const chime = () => {
      playSound(source, Math.min(1, 0.4 + 0.2 * count));
      Vibration.vibrate([0, 250, 120, 250]);
      count += 1;
    };
    chime();
    const id = setInterval(chime, prefs.scene === "express" ? 4500 : 3600);
    return () => {
      clearInterval(id);
      stopSound();
      Vibration.cancel();
    };
  }, [ringing, prefs.scene, prefs.ringtone]);

  const answer = useCallback(
    (snooze: boolean) => {
      const r = ringingRef.current;
      if (!r) return;
      setRinging(null);
      if (r.demo) {
        setDemoUntil(null);
        return;
      }
      if (!r.id) return;
      if (snooze) {
        reminders.snooze(r.id);
        setToast({ text: "Snoozed for 10 minutes" });
      } else {
        reminders.done(r.id);
      }
    },
    [reminders],
  );

  const startPreview = useCallback(() => {
    if (ringingRef.current) return;
    setDemoUntil(Date.now() + 20000);
  }, []);

  const value = useMemo(
    () => ({ reminders, ringing, demoUntil, toast, flash, dismissToast, startPreview, answer }),
    [reminders, ringing, demoUntil, toast, flash, dismissToast, startPreview, answer],
  );
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
