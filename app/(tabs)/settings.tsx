import { ScrollView, Switch, Text, View } from "react-native";
import DateTimeField from "@/components/date-time-field";
import { Card } from "@/components/luxe";
import { FONT } from "@/constants/fonts";
import { requestLocalNotificationPermission } from "@/lib/notifications";
import { useTheme } from "@/lib/theme";

const atHour = (hour: number) => new Date(2000, 0, 1, hour, 0, 0, 0);

export default function SettingsScreen() {
  const { finish: c, prefs, setPrefs } = useTheme();

  const toggleReminders = async (value: boolean) => {
    if (value) await requestLocalNotificationPermission();
    await setPrefs({ notificationsEnabled: value });
  };

  const name = { color: c.ink, fontFamily: FONT.strong, fontSize: 15 };
  const note = { color: c.mut, fontFamily: FONT.regular, fontSize: 12.5, marginTop: 2 };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12, width: "100%", maxWidth: 560, alignSelf: "center" }}>
      <Text style={{ color: c.m1, fontFamily: FONT.display, fontSize: 32 }}>Settings</Text>

      <Card style={{ gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={name}>Reminders</Text>
            <Text style={note}>Remind me at the time I choose</Text>
          </View>
          <Switch value={prefs.notificationsEnabled} onValueChange={toggleReminders} trackColor={{ false: c.bd, true: c.m2 }} thumbColor={c.m1} />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={name}>Quiet hours</Text>
          <Text style={note}>No reminder alerts in this window</Text>
          <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
            <Text style={{ color: c.mut, fontFamily: FONT.body, fontSize: 12 }}>From</Text>
            <View style={{ flex: 1 }}>
              <DateTimeField value={atHour(prefs.quietHoursStart)} mode="time" onChange={(date) => date && setPrefs({ quietHoursStart: date.getHours() })} />
            </View>
            <Text style={{ color: c.mut, fontFamily: FONT.body, fontSize: 12 }}>to</Text>
            <View style={{ flex: 1 }}>
              <DateTimeField value={atHour(prefs.quietHoursEnd)} mode="time" onChange={(date) => date && setPrefs({ quietHoursEnd: date.getHours() })} />
            </View>
          </View>
        </View>
      </Card>

      <Text style={note}>Ringtone, finish and motion are in Quick style on the Today page, so you never have to hunt for them.</Text>
    </ScrollView>
  );
}
