import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Card, Pill } from "@/components/luxe";
import { FONT } from "@/constants/fonts";
import { useApp } from "@/lib/app-state";
import { whenOf } from "@/lib/commitment";
import { clock12, dayLabel, dayWord, relativeTime } from "@/lib/format";
import { useTheme } from "@/lib/theme";

export default function RemindersScreen() {
  const { finish: c } = useTheme();
  const { reminders } = useApp();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 10, width: "100%", maxWidth: 640, alignSelf: "center" }}>
      <Text style={{ color: c.m1, fontFamily: FONT.display, fontSize: 32 }}>Your reminders</Text>
      <Text style={{ color: c.mut, fontFamily: FONT.regular, fontSize: 13.5 }}>
        {reminders.open.length === 0 ? "Nothing yet. Set one from Today and it will wait for you here." : `${reminders.open.length} waiting. The watch follows the highlighted one.`}
      </Text>
      {reminders.open.map((item) => {
        const at = whenOf(item);
        const following = item.id === reminders.cur?.id;
        return (
          <Card key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, borderColor: following ? c.m1 : c.bd }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.ink, fontFamily: FONT.strong, fontSize: 16 }}>{item.title}</Text>
              {at ? (
                <Text style={{ color: c.mut, fontFamily: FONT.regular, fontSize: 12.5, marginTop: 2 }}>
                  {dayWord(at, now)} · {dayLabel(at)} · {clock12(at)} · {relativeTime(at, now)}
                </Text>
              ) : null}
            </View>
            {following ? null : <Pill label="Follow" onPress={() => reminders.select(item.id)} />}
            <Pill label="Done" onPress={() => reminders.done(item.id)} />
            <Pill label="✕" onPress={() => reminders.remove(item.id)} accessibilityLabel={`Delete ${item.title}`} />
          </Card>
        );
      })}
    </ScrollView>
  );
}
