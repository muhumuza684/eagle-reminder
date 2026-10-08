import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, Vibration, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Card, Eyebrow, MetalBg, Pill } from "@/components/luxe";
import { Dial } from "@/components/watch/dial";
import { FONT } from "@/constants/fonts";
import { useReminders } from "@/hooks/use-reminders";
import { useVoiceCapture } from "@/hooks/use-voice-capture";
import { whenOf } from "@/lib/commitment";
import { parseCommitment } from "@/lib/commitment-parser";
import { DAY_ABBR, MONTH_ABBR, clock12, dayLabel, greeting, relativeTime } from "@/lib/format";
import { requestLocalNotificationPermission } from "@/lib/notifications";
import { onPreview } from "@/lib/preview-bus";
import { HORN, RINGTONES, playSound, stopSound } from "@/lib/sound";
import { useTheme } from "@/lib/theme";

type Ringing = { id: string | null; title: string; demo: boolean };
type Toast = { text: string; undo?: boolean };

const VOICE_ERRORS: Record<string, string> = {
  "not-allowed": "The microphone is blocked. Allow it in your browser's site settings, then tap the mic again.",
  "service-not-allowed": "The microphone is blocked. Allow it in your browser's site settings, then tap the mic again.",
  "no-speech": "I didn't hear anything. Tap the mic and try again.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice typing needs an internet connection.",
  default: "Voice didn't work this time. You can type it instead.",
};

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export default function TodayScreen() {
  const { finish: c, prefs } = useTheme();
  const { width, height } = useWindowDimensions();
  const wide = width >= 840;
  const reminders = useReminders();
  const { cur, open } = reminders;

  const [now, setNow] = useState(() => new Date());
  const [sel, setSel] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d;
  });
  const [month, setMonth] = useState(() => new Date(sel.getFullYear(), sel.getMonth(), 1));
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [pm, setPm] = useState(true);
  const [touched, setTouched] = useState(false);
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [sheet, setSheet] = useState<"month" | "list" | null>(null);
  const [demoUntil, setDemoUntil] = useState<number | null>(null);
  const [ringing, setRinging] = useState<Ringing | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.undo ? 6000 : 2400);
    return () => clearTimeout(id);
  }, [toast]);

  // When something is removed, offer to bring it back.
  useEffect(() => {
    if (reminders.removed) setToast({ text: `Removed “${reminders.removed.title}”`, undo: true });
  }, [reminders.removed]);

  const flash = useCallback((message: string) => setToast({ text: message }), []);

  // ---- when will it ring? words win until the day or time controls are touched ----
  const picked = useMemo(() => {
    const d = new Date(sel);
    d.setHours((hour % 12) + (pm ? 12 : 0), minute, 0, 0);
    return d;
  }, [sel, hour, minute, pm]);
  const parsed = useMemo(() => (text.trim() ? parseCommitment(text) : null), [text]);
  const fromText = !!parsed?.explicit && !touched;
  const when = (fromText && parsed ? whenOf(parsed) : null) ?? picked;

  const touch = <T,>(setter: (value: T) => void) => (value: T) => {
    setTouched(true);
    setter(value);
  };

  const onSet = async () => {
    if (when.getTime() <= Date.now()) {
      flash("That moment has passed — pick a later time");
      return;
    }
    requestLocalNotificationPermission().catch(() => undefined);
    reminders.add(text, fromText ? null : picked);
    setText("");
    setTouched(false);
    flash(`Done — I'll remind you at ${clock12(when)}`);
  };

  // ---- voice: tap, speak, check, Set ----
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const voice = useVoiceCapture({
    onResult: ({ transcript, isFinal }) => {
      if (transcript) setText(transcript);
      if (isFinal) {
        setListening(false);
        setTouched(false); // what you said wins over the day and time controls
        setVoiceNote(null);
      }
    },
    onError: (reason) => {
      setListening(false);
      setVoiceNote(VOICE_ERRORS[reason ?? ""] ?? VOICE_ERRORS.default);
    },
    onEnd: () => setListening(false),
  });
  const toggleVoice = async () => {
    setVoiceNote(null);
    if (!voice.isSupported) {
      setVoiceNote("Voice typing works in Chrome or Edge. In this browser, please type it instead.");
      return;
    }
    if (listening) {
      voice.stop();
      setListening(false);
      return;
    }
    const started = await voice.start();
    setListening(started);
    if (!started) setVoiceNote(VOICE_ERRORS.default);
  };

  // ---- the moving part reaches the goal: ring until answered ----
  const onArrive = useCallback(() => {
    setRinging({ id: demoUntil != null ? null : (cur?.id ?? null), title: cur?.title ?? "Preview", demo: demoUntil != null });
  }, [cur, demoUntil]);

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

  const answer = (snooze: boolean) => {
    const r = ringing;
    if (!r) return;
    setRinging(null);
    if (r.demo) {
      setDemoUntil(null);
      return;
    }
    if (!r.id) return;
    if (snooze) {
      reminders.snooze(r.id);
      flash("Snoozed for 10 minutes");
    } else {
      reminders.done(r.id);
    }
  };

  const startPreview = useCallback(() => {
    if (ringing) return;
    setDemoUntil(Date.now() + 20000);
  }, [ringing]);
  useEffect(() => onPreview(startPreview), [startPreview]);

  // ---- calendar helpers ----
  const weekStart = new Date(sel);
  weekStart.setDate(sel.getDate() - sel.getDay());
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const monthDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const monthCells: (Date | null)[] = [
    ...Array.from({ length: month.getDay() }, () => null),
    ...Array.from({ length: monthDays }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i + 1)),
  ];
  const pickDay = (d: Date) => {
    setTouched(true);
    setSel(d);
    setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    setSheet(null);
  };

  // ---- layout ----
  const dialSize = Math.max(200, wide ? Math.min(width * 0.48 - 20, height - 200, 540) : Math.min(width - 28, height * 0.42, 480));
  const curWhen = cur ? whenOf(cur) : null;
  const flip = { day: DAY_ABBR[sel.getDay()], date: String(sel.getDate()), month: MONTH_ABBR[sel.getMonth()] };
  const body = { color: c.ink, fontFamily: FONT.body, fontSize: 13 };

  const dial = (
    <Dial
      size={dialSize}
      scene={prefs.scene}
      goals={open.flatMap((item) => {
        const at = whenOf(item);
        return at ? [{ at, selected: item.id === cur?.id }] : [];
      })}
      current={curWhen}
      demoUntil={demoUntil}
      ringing={!!ringing}
      flip={flip}
      onArrive={onArrive}
    />
  );

  const step = (label: string, onPress: () => void, hint: string) => <Pill label={label} onPress={onPress} accessibilityLabel={hint} style={{ minWidth: 34 }} />;

  const controls = (
    <View style={{ gap: 8, width: "100%" }}>
      <View style={{ flexDirection: "row", gap: 8, justifyContent: "center" }}>
        <Pill label="▶ Preview" onPress={startPreview} />
        <Pill label={`Reminders · ${open.length}`} onPress={() => setSheet(sheet === "list" ? null : "list")} />
      </View>

      <Text style={{ color: c.mut, fontFamily: FONT.regular, fontSize: 13, textAlign: "center", minHeight: 36 }}>
        {cur && curWhen ? (
          <>
            {greeting(now)}. <Text style={{ color: c.m1, fontFamily: FONT.displayBold, fontSize: 16 }}>{cur.title}</Text> is {relativeTime(curWhen, now)} — I&apos;ll tap your shoulder.
          </>
        ) : (
          `${greeting(now)}. Nothing to remember yet — tell me what matters.`
        )}
      </Text>

      <Card>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <Eyebrow>This week</Eyebrow>
          <Pill label="Month ▾" onPress={() => setSheet(sheet === "month" ? null : "month")} />
        </View>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {week.map((d) => {
            const on = sameDay(d, sel);
            return (
              <Pressable
                key={d.getTime()}
                onPress={() => pickDay(d)}
                accessibilityRole="button"
                accessibilityLabel={dayLabel(d)}
                style={{ flex: 1, alignItems: "center", paddingVertical: 4, borderRadius: 14, overflow: "hidden", borderWidth: sameDay(d, now) && !on ? 1 : 0, borderColor: c.m2 }}
              >
                {on ? <MetalBg radius={14} /> : null}
                <Text style={{ color: on ? "#120d06" : c.mut, fontFamily: FONT.strong, fontSize: 8 }}>{"SMTWTFS"[d.getDay()]}</Text>
                <Text style={{ color: on ? "#120d06" : c.ink, fontFamily: FONT.display, fontSize: 15 }}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 }}>
        {step("−", () => touch(setHour)(((hour + 10) % 12) + 1), "Earlier hour")}
        <Text style={{ color: c.ink, fontFamily: FONT.displayBold, fontSize: 26, minWidth: 34, textAlign: "center" }}>{hour}</Text>
        {step("+", () => touch(setHour)((hour % 12) + 1), "Later hour")}
        <Text style={{ color: c.m1, fontFamily: FONT.displayBold, fontSize: 24 }}>:</Text>
        {step("−5", () => touch(setMinute)((minute + 55) % 60), "Five minutes earlier")}
        <Text style={{ color: c.ink, fontFamily: FONT.displayBold, fontSize: 26, minWidth: 34, textAlign: "center" }}>{String(minute).padStart(2, "0")}</Text>
        {step("+5", () => touch(setMinute)((minute + 5) % 60), "Five minutes later")}
        <Pill label="AM" active={!pm} onPress={() => touch(setPm)(false)} />
        <Pill label="PM" active={pm} onPress={() => touch(setPm)(true)} />
      </Card>

      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Say it or type it…"
          placeholderTextColor={c.mut}
          accessibilityLabel="What should I remind you about?"
          onSubmitEditing={onSet}
          style={{ flex: 1, minWidth: 0, borderWidth: 1, borderColor: c.bd, backgroundColor: c.cd, borderRadius: 99, paddingVertical: 11, paddingHorizontal: 16, color: c.ink, fontFamily: FONT.regular, fontSize: 14 }}
        />
        <Pressable
          onPress={toggleVoice}
          accessibilityRole="button"
          accessibilityLabel={listening ? "Stop listening" : "Speak a reminder"}
          style={{ width: 44, height: 44, borderRadius: 22, borderWidth: listening ? 2 : 1, borderColor: listening ? c.gem : c.bd, backgroundColor: listening ? c.cd : "transparent", alignItems: "center", justifyContent: "center" }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path fill={listening ? c.gem : c.ink} d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z" />
          </Svg>
        </Pressable>
        <Pill label="Set" primary big onPress={onSet} />
      </View>
      <Text accessibilityLiveRegion="polite" style={{ color: voiceNote ? c.warn : c.mut, fontFamily: FONT.regular, fontSize: 12, textAlign: "center", minHeight: 32 }}>
        {voiceNote ? (
          voiceNote
        ) : listening ? (
          <>Listening… say it like “Call Mum tomorrow at 7 pm”</>
        ) : (
          <>
            {fromText ? "Heard it. Tap Set to remind you " : "I'll remind you "}
            <Text style={{ color: c.m1, fontFamily: FONT.body }}>
              {dayLabel(when)} · {clock12(when)}
            </Text>
          </>
        )}
      </Text>
    </View>
  );

  const sheetBox = { width: "100%" as const, maxWidth: 380, borderWidth: 1, borderColor: c.m2, borderRadius: 18, padding: 12, backgroundColor: c.b1 };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          padding: 14,
          gap: 12,
          justifyContent: "center",
          alignItems: "center",
          flexDirection: wide ? "row" : "column",
          width: "100%",
          maxWidth: 980,
          alignSelf: "center",
        }}
      >
        <View style={{ alignItems: "center" }}>{dial}</View>
        <View style={{ flex: wide ? 1 : undefined, maxWidth: 520, width: wide ? undefined : "100%" }}>{controls}</View>
      </ScrollView>

      {sheet ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 8, alignItems: "center", paddingHorizontal: 14 }}>
          {sheet === "month" ? (
            <View style={sheetBox}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Pill label="‹" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} accessibilityLabel="Previous month" />
                <Text style={{ color: c.m1, fontFamily: FONT.displayBold, fontSize: 18 }}>{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</Text>
                <Pill label="›" onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} accessibilityLabel="Next month" />
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {"SMTWTFS".split("").map((d, i) => (
                  <Text key={`h${i}`} style={{ width: "14.2857%", textAlign: "center", color: c.mut, fontFamily: FONT.strong, fontSize: 9 }}>
                    {d}
                  </Text>
                ))}
                {monthCells.map((d, i) => (
                  <View key={i} style={{ width: "14.2857%", aspectRatio: 1, padding: 1 }}>
                    {d ? (
                      <Pressable
                        onPress={() => pickDay(d)}
                        accessibilityRole="button"
                        accessibilityLabel={dayLabel(d)}
                        style={{ flex: 1, borderRadius: 99, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: sameDay(d, now) && !sameDay(d, sel) ? 1 : 0, borderColor: c.m2 }}
                      >
                        {sameDay(d, sel) ? <MetalBg /> : null}
                        <Text style={{ color: sameDay(d, sel) ? "#120d06" : c.ink, fontFamily: FONT.display, fontSize: 15 }}>{d.getDate()}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <View style={[sheetBox, { maxHeight: Math.max(220, height * 0.55) }]}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <Eyebrow>Your reminders</Eyebrow>
                <Pill label="Close" onPress={() => setSheet(null)} />
              </View>
              <ScrollView>
                {open.length === 0 ? <Text style={{ color: c.mut, fontFamily: FONT.regular, paddingVertical: 8 }}>Nothing yet.</Text> : null}
                {open.map((item) => {
                  const at = whenOf(item);
                  return (
                    <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, borderTopWidth: 1, borderColor: c.bd }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[body, { fontFamily: FONT.strong }, item.id === cur?.id && { color: c.m1 }]}>{item.title}</Text>
                        {at ? <Text style={{ color: c.mut, fontFamily: FONT.regular, fontSize: 12 }}>{dayLabel(at)} · {clock12(at)} · {relativeTime(at, now)}</Text> : null}
                      </View>
                      <Pill label="Follow" onPress={() => { reminders.select(item.id); setSheet(null); }} />
                      <Pill label="✕" onPress={() => reminders.remove(item.id)} accessibilityLabel={`Delete ${item.title}`} />
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>
      ) : null}

      {ringing ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 10, alignItems: "center", paddingHorizontal: 14 }}>
          <View accessibilityRole="alert" style={{ width: "100%", maxWidth: 420, borderWidth: 1, borderColor: c.m1, borderRadius: 22, padding: 16, alignItems: "center", backgroundColor: c.b1 }}>
            <Eyebrow>Ringing · until you answer</Eyebrow>
            <Text style={{ color: c.m1, fontFamily: FONT.displayBold, fontSize: 28, marginVertical: 8, textAlign: "center" }}>{ringing.title}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pill label="Done" primary big onPress={() => answer(false)} />
              <Pill label="Snooze 10 min" big onPress={() => answer(true)} />
            </View>
          </View>
        </View>
      ) : null}

      {toast && !ringing ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 8, alignItems: "center", paddingHorizontal: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 99, paddingVertical: 9, paddingHorizontal: 16, overflow: "hidden", maxWidth: "100%" }}>
            <MetalBg />
            <Text style={{ color: "#120d06", fontFamily: FONT.strong, fontSize: 13, flexShrink: 1 }}>{toast.text}</Text>
            {toast.undo ? (
              <Pressable onPress={() => { reminders.undo(); setToast(null); }} accessibilityRole="button" accessibilityLabel="Undo">
                <Text style={{ color: "#120d06", fontFamily: FONT.strong, fontSize: 13, textDecorationLine: "underline" }}>Undo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}
