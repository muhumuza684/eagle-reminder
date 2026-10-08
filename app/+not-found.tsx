import { Link, Stack } from "expo-router";
import { Text, View } from "react-native";
import { FONT } from "@/constants/fonts";
import { useTheme } from "@/lib/theme";

export default function NotFoundScreen() {
  const { finish: c } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14, backgroundColor: c.b0 }}>
        <Text style={{ color: c.m1, fontFamily: FONT.display, fontSize: 30, textAlign: "center" }}>This page doesn&apos;t exist.</Text>
        <Link href="/" style={{ color: c.ink, fontFamily: FONT.strong, fontSize: 14 }}>
          Back to the watch
        </Link>
      </View>
    </>
  );
}
