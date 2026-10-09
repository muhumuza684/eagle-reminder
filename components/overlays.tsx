import { Pressable, Text, View } from "react-native";
import { Eyebrow, MetalBg, Pill, metalStyle } from "@/components/luxe";
import { FONT } from "@/constants/fonts";
import { useApp } from "@/lib/app-state";
import { useTheme } from "@/lib/theme";

/** The ringing card and the toast. They float above every screen. */
export function Overlays() {
  const { finish: c } = useTheme();
  const app = useApp();

  return (
    <>
      {app.ringing ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 96, alignItems: "center", paddingHorizontal: 14 }}>
          <View accessibilityRole="alert" style={{ width: "100%", maxWidth: 420, borderWidth: 1, borderColor: c.m1, borderRadius: 22, padding: 16, alignItems: "center", backgroundColor: c.b1 }}>
            <Eyebrow>Ringing · until you answer</Eyebrow>
            <Text style={{ color: c.m1, fontFamily: FONT.displayBold, fontSize: 28, marginVertical: 8, textAlign: "center" }}>{app.ringing.title}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pill label="Done" primary big onPress={() => app.answer(false)} />
              <Pill label="Snooze 10 min" big onPress={() => app.answer(true)} />
            </View>
          </View>
        </View>
      ) : null}

      {app.toast && !app.ringing ? (
        <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, top: 10, alignItems: "center", paddingHorizontal: 14 }}>
          <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 99, paddingVertical: 10, paddingHorizontal: 18, maxWidth: "100%", overflow: "hidden" }, metalStyle(c)]}>
            <Text style={{ color: "#120d06", fontFamily: FONT.strong, fontSize: 13, flexShrink: 1 }}>{app.toast.text}</Text>
            {app.toast.undo ? (
              <Pressable
                onPress={() => {
                  app.reminders.undo();
                  app.dismissToast();
                }}
                accessibilityRole="button"
                accessibilityLabel="Undo"
              >
                <Text style={{ color: "#120d06", fontFamily: FONT.strong, fontSize: 13, textDecorationLine: "underline" }}>Undo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </>
  );
}
