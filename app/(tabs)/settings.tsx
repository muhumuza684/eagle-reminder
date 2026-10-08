import { useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import DateTimeField from "@/components/date-time-field";
import { Card, Eyebrow, Pill } from "@/components/luxe";
import { FONT } from "@/constants/fonts";
import { requestLocalNotificationPermission } from "@/lib/notifications";
import { requestPreview } from "@/lib/preview-bus";
import type { FinishKey, RingtoneKey, SceneKey } from "@/lib/preferences-defaults";
import { RINGTONES, RINGTONE_KEYS, playSound, stopSound } from "@/lib/sound";
import { FINISH_KEYS, paletteFor, useTheme } from "@/lib/theme";

const SCENES: { key: SceneKey; name: string; note: string }[] = [
  { key: "orbit", name: "Orbit", note: "A gold bead with a trail of light laps the ring and lands in your gem on time" },
  { key: "spring", name: "Mainspring", note: "A power-reserve arc winds up and the tourbillon races as your time nears" },
  { key: "express", name: "Express", note: "A gold locomotive glides into the station arch at your time" },
];

const hourLabel = (hour: number) => `${hour % 12 === 0 ? 12 : hour % 12}:00 ${hour >= 12 ? "PM" : "AM"}`;

function Swatch({ finish, active, onPress }: { finish: FinishKey; active: boolean; onPress: () => void }) {
  const p = paletteFor(finish);
  const { finish: c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={p.name}
      style={{ width: 44, height: 44, borderRadius: 22, borderWidth: active ? 2 : 1, borderColor: active ? c.m1 : c.bd, padding: 3 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 10 10">
        <Defs>
          <LinearGradient id={`sw-${finish}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={p.m1} />
            <Stop offset="1" stopColor={p.gem} />
          </LinearGradient>
        </Defs>
        <Circle cx={5} cy={5} r={5} fill={`url(#sw-${finish})`} />
      </Svg>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { finish: c, prefs, setPrefs } = useTheme();
  const router = useRouter();
  const [picker, setPicker] = useState<"quietStart" | "quietEnd" | null>(null);

  useEffect(() => stopSound, []);

  const toggleReminders = async (value: boolean) => {
    if (value) await requestLocalNotificationPermission();
    await setPrefs({ notificationsEnabled: value });
  };

  const applyQuietHour = async (hour: number) => {
    await setPrefs(picker === "quietStart" ? { quietHoursStart: hour } : { quietHoursEnd: hour });
    setPicker(null);
  };

  const chooseScene = (scene: SceneKey, preview: boolean) => {
    setPrefs({ scene });
    if (preview) {
      requestPreview();
      router.navigate("/");
    }
  };

  const chooseTone = (tone: RingtoneKey) => {
    setPrefs({ ringtone: tone });
    playSound(RINGTONES[tone].source, 1);
  };

  const row = { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, gap: 12, paddingVertical: 11 };
  const name = { color: c.ink, fontFamily: FONT.strong, fontSize: 14 };
  const note = { color: c.mut, fontFamily: FONT.regular, fontSize: 12, marginTop: 2 };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, width: "100%", maxWidth: 560, alignSelf: "center" }}>
      <Text style={{ color: c.m1, fontFamily: FONT.display, fontSize: 32 }}>Settings</Text>

      <Card>
        <View style={row}>
          <View style={{ flex: 1 }}>
            <Text style={name}>Reminders</Text>
            <Text style={note}>Remind me at the time I choose</Text>
          </View>
          <Switch value={prefs.notificationsEnabled} onValueChange={toggleReminders} trackColor={{ false: c.bd, true: c.m2 }} thumbColor={c.m1} />
        </View>
        <Pressable onPress={() => setPicker("quietStart")} style={[row, { borderTopWidth: 1, borderColor: c.bd }]}>
          <View style={{ flex: 1 }}>
            <Text style={name}>Quiet hours</Text>
            <Text style={note}>No reminder alerts during this window</Text>
          </View>
          <Text style={{ color: c.m1, fontFamily: FONT.body, fontSize: 13 }}>
            {hourLabel(prefs.quietHoursStart)} – {hourLabel(prefs.quietHoursEnd)}
          </Text>
        </Pressable>
        <Pressable onPress={() => setPicker("quietEnd")} style={[row, { borderTopWidth: 1, borderColor: c.bd }]}>
          <Text style={name}>Quiet hours end</Text>
          <Text style={{ color: c.m1, fontFamily: FONT.body, fontSize: 13 }}>{hourLabel(prefs.quietHoursEnd)}</Text>
        </Pressable>
      </Card>

      <Card>
        <Eyebrow>Motion</Eyebrow>
        {SCENES.map((scene) => (
          <Pressable key={scene.key} onPress={() => chooseScene(scene.key, false)} style={[row, { borderTopWidth: 1, borderColor: c.bd }]}>
            <View style={{ flex: 1 }}>
              <Text style={[name, prefs.scene === scene.key && { color: c.m1 }]}>{scene.name}</Text>
              <Text style={note}>{scene.note}</Text>
            </View>
            <Pill label="▶ Preview" onPress={() => chooseScene(scene.key, true)} active={prefs.scene === scene.key} />
          </Pressable>
        ))}
      </Card>

      <Card>
        <Eyebrow>Finish</Eyebrow>
        <View style={{ flexDirection: "row", gap: 14, paddingVertical: 10, flexWrap: "wrap" }}>
          {FINISH_KEYS.map((key) => (
            <Swatch key={key} finish={key} active={prefs.finish === key} onPress={() => setPrefs({ finish: key })} />
          ))}
        </View>
        <Text style={note}>{c.name}</Text>
      </Card>

      <Card>
        <Eyebrow>Ringtone</Eyebrow>
        {RINGTONE_KEYS.map((key) => (
          <Pressable key={key} onPress={() => chooseTone(key)} style={[row, { borderTopWidth: 1, borderColor: c.bd }]}>
            <View style={{ flex: 1 }}>
              <Text style={[name, prefs.ringtone === key && { color: c.m1 }]}>{RINGTONES[key].name}</Text>
              <Text style={note}>{RINGTONES[key].note}</Text>
            </View>
            <Pill label="▶ Play" onPress={() => chooseTone(key)} active={prefs.ringtone === key} />
          </Pressable>
        ))}
        <Text style={[note, { paddingTop: 8 }]}>Reminders keep ringing until you tap Done or Snooze.</Text>
      </Card>

      {picker ? (
        <DateTimeField
          value={new Date(2000, 0, 1, picker === "quietStart" ? prefs.quietHoursStart : prefs.quietHoursEnd, 0)}
          mode="time"
          onChange={(date) => (date ? applyQuietHour(date.getHours()) : setPicker(null))}
        />
      ) : null}
    </ScrollView>
  );
}
