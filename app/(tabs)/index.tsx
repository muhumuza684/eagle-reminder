import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { Compose } from "@/components/compose";
import { Pill } from "@/components/luxe";
import { Palette } from "@/components/palette";
import { Dial } from "@/components/watch/dial";
import { FONT } from "@/constants/fonts";
import { useApp } from "@/lib/app-state";
import { whenOf } from "@/lib/commitment";
import { DAY_ABBR, MONTH_ABBR, clock12, dayWord, greeting, relativeTime } from "@/lib/format";
import { requestLocalNotificationPermission } from "@/lib/notifications";
import { tomorrowAt } from "@/lib/quick-times";
import { useTheme } from "@/lib/theme";

export default function TodayScreen() {
  const { finish: c, prefs } = useTheme();
  const app = useApp();
  const { cur, open } = app.reminders;
  const { width, height } = useWindowDimensions();
  const wide = width >= 1000;
  const medium = width >= 640;

  const [draft, setDraft] = useState(() => tomorrowAt(19));
  const [now, setNow] = useState(() => new Date());
  const [styleOpen, setStyleOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(id);
  }, []);

  const onSubmit = (text: string): boolean => {
    if (draft.getTime() <= Date.now()) {
      app.flash("That moment has passed — pick a later time");
      return false;
    }
    requestLocalNotificationPermission().catch(() => undefined);
    app.reminders.add(text, draft);
    app.flash(`Done — I'll remind you ${dayWord(draft, now).toLowerCase()} at ${clock12(draft)}`);
    return true;
  };

  const dialSize = Math.max(
    210,
    wide ? Math.min(width * 0.36, height - 200, 540) : medium ? Math.min(width * 0.42, height - 240, 440) : Math.min(width - 32, height * 0.4, 360),
  );
  const curWhen = cur ? whenOf(cur) : null;
  const flip = { day: DAY_ABBR[draft.getDay()], date: String(draft.getDate()), month: MONTH_ABBR[draft.getMonth()] };

  const watch = (
    <View style={{ alignItems: "center", gap: 10, flexGrow: wide ? 1.15 : 1, flexBasis: wide ? 0 : medium ? "40%" : "auto" }}>
      <Dial
        size={dialSize}
        scene={prefs.scene}
        goals={open.flatMap((item) => {
          const at = whenOf(item);
          return at ? [{ at, selected: item.id === cur?.id }] : [];
        })}
        current={curWhen}
        draft={draft}
        demoUntil={app.demoUntil}
        ringing={!!app.ringing}
        flip={flip}
      />
      <Pill label="▶ Preview the motion" onPress={app.startPreview} />
    </View>
  );

  const middle = (
    <View style={{ flexGrow: 1, flexBasis: wide ? 0 : medium ? "50%" : "auto", maxWidth: 560, width: "100%", gap: 12 }}>
      <Text style={{ color: c.mut, fontFamily: FONT.regular, fontSize: 13.5 }}>
        {cur && curWhen ? (
          <>
            {greeting(now)}. <Text style={{ color: c.m1, fontFamily: FONT.displayBold, fontSize: 17 }}>{cur.title}</Text> is {relativeTime(curWhen, now)} — I&apos;ll tap your shoulder.
          </>
        ) : (
          `${greeting(now)}. Nothing to remember yet — tell me what matters.`
        )}
      </Text>
      <Compose draft={draft} setDraft={setDraft} onSubmit={onSubmit} />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          gap: 18,
          alignItems: wide ? "center" : "stretch",
          justifyContent: "center",
          flexDirection: medium ? "row" : "column",
          flexWrap: wide ? "nowrap" : "wrap",
          width: "100%",
          maxWidth: 1320,
          alignSelf: "center",
          paddingBottom: medium ? 16 : 84,
        }}
      >
        {watch}
        {middle}
        {wide ? (
          <View style={{ width: 270 }}>
            <Palette />
          </View>
        ) : medium ? (
          <View style={{ width: "100%" }}>
            <Palette columns />
          </View>
        ) : null}
      </ScrollView>

      {!medium ? (
        <>
          <Pressable
            onPress={() => setStyleOpen(!styleOpen)}
            accessibilityRole="button"
            accessibilityLabel="Quick style"
            style={{ position: "absolute", right: 14, bottom: 12, borderWidth: 1, borderColor: c.m1, backgroundColor: c.m1, borderRadius: 99, paddingVertical: 11, paddingHorizontal: 16 }}
          >
            <Text style={{ color: "#120d06", fontFamily: FONT.strong, fontSize: 12.5 }}>✦ Quick style</Text>
          </Pressable>
          {styleOpen ? (
            <View style={{ position: "absolute", left: 10, right: 10, bottom: 62, maxHeight: Math.max(240, height * 0.6), backgroundColor: c.b1, borderRadius: 20 }}>
              <ScrollView>
                <Palette />
              </ScrollView>
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
