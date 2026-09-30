import "react-native-get-random-values";
import { Stack } from "expo-router";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  // Vector-icon fonts do not reliably load on the web export unless they are
  // requested through expo-font first. If loading fails the app still renders.
  const [iconsLoaded, iconsError] = useFonts({ ...Ionicons.font });

  if (!iconsLoaded && !iconsError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="about" options={{ title: "About", headerShown: true }} />
      </Stack>
    </SafeAreaProvider>
  );
}