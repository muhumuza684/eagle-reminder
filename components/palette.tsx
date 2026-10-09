import { Pressable, Text, View } from "react-native";
import { Eyebrow } from "@/components/luxe";
import { FONT } from "@/constants/fonts";
import type { SceneKey } from "@/lib/preferences-defaults";
import { RINGTONES, RINGTONE_KEYS, playSound } from "@/lib/sound";
import { FINISH_KEYS, paletteFor, useTheme } from "@/lib/theme";

export const SCENES: Record<SceneKey, { name: string; note: string }> = {
  orbit: { name: "Orbit", note: "A gold bead laps the ring and lands in your gem" },
  spring: { name: "Mainspring", note: "An arc winds up as your time nears" },
  express: { name: "Express", note: "A locomotive glides into the station" },
};
export const SCENE_KEYS = Object.keys(SCENES) as SceneKey[];

/** Quick style: ringtone, finish and motion in one place, so nobody has to dig through Settings. */
export function Palette({ columns = false }: { columns?: boolean }) {
  const { finish: c, prefs, setPrefs } = useTheme();
  const group = { flex: columns ? 1 : undefined, minWidth: columns ? 200 : undefined, gap: 8 } as const;

  const tile = (active: boolean) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    borderWidth: 1,
    borderColor: active ? c.m1 : c.bd,
    backgroundColor: active ? `${c.m1}1f` : "transparent",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  });
  const name = { color: c.ink, fontFamily: FONT.strong, fontSize: 13 };
  const note = { color: c.mut, fontFamily: FONT.regular, fontSize: 11, marginTop: 1 };

  return (
    <View
      style={{
        flexDirection: columns ? "row" : "column",
        flexWrap: "wrap",
        gap: 16,
        borderWidth: 1,
        borderColor: c.bd,
        backgroundColor: c.cd,
        borderRadius: 20,
        padding: 14,
        width: "100%",
      }}
    >
      <View style={group}>
        <Eyebrow>Ringtone</Eyebrow>
        {RINGTONE_KEYS.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`${RINGTONES[key].name}, play`}
            onPress={() => {
              setPrefs({ ringtone: key });
              playSound(RINGTONES[key].source, 1);
            }}
            style={tile(prefs.ringtone === key)}
          >
            <View style={{ flex: 1 }}>
              <Text style={name}>{RINGTONES[key].name}</Text>
              <Text style={note}>{RINGTONES[key].note}</Text>
            </View>
            <Text style={{ color: c.m1, fontSize: 12 }}>▶</Text>
          </Pressable>
        ))}
      </View>

      <View style={group}>
        <Eyebrow>Finish</Eyebrow>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {FINISH_KEYS.map((key) => {
            const p = paletteFor(key);
            const active = prefs.finish === key;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={p.name}
                onPress={() => setPrefs({ finish: key })}
                style={{ width: 40, height: 40, borderRadius: 20, padding: 3, borderWidth: active ? 2 : 1, borderColor: active ? c.m1 : c.bd }}
              >
                <View style={{ flex: 1, borderRadius: 20, backgroundImage: `linear-gradient(135deg, ${p.m1}, ${p.gem})` } as object} />
              </Pressable>
            );
          })}
        </View>
        <Text style={note}>{c.name}</Text>
      </View>

      <View style={group}>
        <Eyebrow>Motion</Eyebrow>
        {SCENE_KEYS.map((key) => (
          <Pressable key={key} accessibilityRole="button" accessibilityLabel={SCENES[key].name} onPress={() => setPrefs({ scene: key })} style={tile(prefs.scene === key)}>
            <View style={{ flex: 1 }}>
              <Text style={name}>{SCENES[key].name}</Text>
              <Text style={note}>{SCENES[key].note}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
