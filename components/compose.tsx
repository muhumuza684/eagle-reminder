import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import DateTimeField from "@/components/date-time-field";
import { Pill, StepTitle } from "@/components/luxe";
import { SCENES, SCENE_KEYS } from "@/components/palette";
import { FONT } from "@/constants/fonts";
import { useVoiceCapture } from "@/hooks/use-voice-capture";
import { whenOf } from "@/lib/commitment";
import { parseCommitment } from "@/lib/commitment-parser";
import { clock12, dayLabel, dayWord, relativeTime } from "@/lib/format";
import { inMinutes, thisEvening, tomorrowAt } from "@/lib/quick-times";
import { RINGTONES, RINGTONE_KEYS, playSound } from "@/lib/sound";
import { useTheme } from "@/lib/theme";

const VOICE_ERRORS: Record<string, string> = {
  "not-allowed": "The microphone is blocked. Allow it in your browser's site settings, then tap the mic again.",
  "service-not-allowed": "The microphone is blocked. Allow it in your browser's site settings, then tap the mic again.",
  "no-speech": "I didn't hear anything. Tap the mic and try again.",
  "audio-capture": "No microphone was found on this device.",
  network: "Voice typing needs an internet connection.",
  default: "Voice didn't work this time. You can type it instead.",
};

type Props = {
  draft: Date;
  setDraft: (when: Date) => void;
  /** Adds the reminder. Returns true when it was added, so the box can clear itself. */
  onSubmit: (text: string) => boolean;
};

/** Guided steps: 1 What, 2 When, 3 Check and set. */
export function Compose({ draft, setDraft, onSubmit }: Props) {
  const { finish: c, prefs, setPrefs } = useTheme();
  const [text, setText] = useState("");
  const [chip, setChip] = useState(-1);
  const [pick, setPick] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  // Words set the day and time as you type or speak; the chips and pickers can change it after.
  const applyText = (value: string) => {
    setText(value);
    const parsed = value.trim() ? parseCommitment(value) : null;
    if (parsed?.explicit) {
      const when = whenOf(parsed);
      if (when) {
        setDraft(when);
        setChip(-1);
      }
    }
  };

  const voice = useVoiceCapture({
    onResult: ({ transcript, isFinal }) => {
      if (transcript) applyText(transcript);
      if (isFinal) {
        setListening(false);
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

  const eveningLabel = thisEvening(now).toDateString() === now.toDateString() ? "This evening" : "Tomorrow evening";
  const chips: { label: string; when: () => Date }[] = [
    { label: "In 10 min", when: () => inMinutes(10) },
    { label: "In 1 hour", when: () => inMinutes(60) },
    { label: eveningLabel, when: () => thisEvening() },
    { label: "Tomorrow 9 AM", when: () => tomorrowAt(9) },
  ];

  const set = () => {
    if (onSubmit(text)) {
      setText("");
      setChip(-1);
    }
  };

  const cycleTone = () => {
    const next = RINGTONE_KEYS[(RINGTONE_KEYS.indexOf(prefs.ringtone) + 1) % RINGTONE_KEYS.length];
    setPrefs({ ringtone: next });
    playSound(RINGTONES[next].source, 1);
  };
  const cycleMotion = () => setPrefs({ scene: SCENE_KEYS[(SCENE_KEYS.indexOf(prefs.scene) + 1) % SCENE_KEYS.length] });

  const panel = { borderWidth: 1, borderColor: c.bd, backgroundColor: c.cd, borderRadius: 20, padding: 16, gap: 12 } as const;

  return (
    <View style={panel}>
      <StepTitle n={1}>What should I remind you about?</StepTitle>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput
          value={text}
          onChangeText={applyText}
          onSubmitEditing={set}
          placeholder="Call Mum"
          placeholderTextColor={c.mut}
          accessibilityLabel="What should I remind you about?"
          style={{ flex: 1, minWidth: 0, borderWidth: 1, borderColor: c.bd, backgroundColor: c.cd, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, color: c.ink, fontFamily: FONT.regular, fontSize: 15 }}
        />
        <Pressable
          onPress={toggleVoice}
          accessibilityRole="button"
          accessibilityLabel={listening ? "Stop listening" : "Speak a reminder"}
          style={{ width: 46, height: 46, borderRadius: 23, borderWidth: listening ? 2 : 1, borderColor: listening ? c.gem : c.bd, alignItems: "center", justifyContent: "center" }}
        >
          <Svg width={19} height={19} viewBox="0 0 24 24">
            <Path fill={listening ? c.gem : c.ink} d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1A7 7 0 0 0 19 11z" />
          </Svg>
        </Pressable>
      </View>
      {voiceNote || listening ? (
        <Text accessibilityLiveRegion="polite" style={{ color: voiceNote ? c.warn : c.gem, fontFamily: FONT.regular, fontSize: 12.5 }}>
          {voiceNote ?? "Listening… say it like “Call Mum tomorrow at 7 pm”"}
        </Text>
      ) : (
        <Text style={{ color: c.mut, fontFamily: FONT.regular, fontSize: 12.5 }}>Tip: include a time and I&apos;ll pick it for you, like “gym Friday at 6pm”.</Text>
      )}

      <StepTitle n={2}>When?</StepTitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {chips.map((item, index) => (
          <Pill
            key={item.label}
            label={item.label}
            active={chip === index}
            onPress={() => {
              setDraft(item.when());
              setChip(index);
            }}
          />
        ))}
        <Pill label="Pick a time…" active={pick} onPress={() => setPick(!pick)} />
      </View>
      {pick ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <DateTimeField
              value={draft}
              mode="date"
              onChange={(next) => {
                if (!next) return;
                const merged = new Date(draft);
                merged.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
                setDraft(merged);
                setChip(-1);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateTimeField
              value={draft}
              mode="time"
              onChange={(next) => {
                if (!next) return;
                setDraft(next);
                setChip(-1);
              }}
            />
          </View>
        </View>
      ) : null}

      <StepTitle n={3}>Check and set</StepTitle>
      <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: c.bd, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 }}>
        <Text style={{ color: c.m1, fontFamily: FONT.displayBold, fontSize: 24 }}>
          {dayWord(draft, now)}, {clock12(draft)}
        </Text>
        <Text style={{ color: c.mut, fontFamily: FONT.regular, fontSize: 12.5 }}>
          {dayLabel(draft)} · {relativeTime(draft, now)}
        </Text>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        <Text style={{ color: c.mut, fontFamily: FONT.regular, fontSize: 12.5 }}>Rings with</Text>
        <Pill label={`${RINGTONES[prefs.ringtone].name} ▾`} onPress={cycleTone} />
        <Text style={{ color: c.mut, fontFamily: FONT.regular, fontSize: 12.5 }}>and shows</Text>
        <Pill label={`${SCENES[prefs.scene].name} ▾`} onPress={cycleMotion} />
      </View>
      <Pill label="Set reminder" primary big onPress={set} />
    </View>
  );
}
