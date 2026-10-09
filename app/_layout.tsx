import "react-native-get-random-values";
import { DefaultTheme, ThemeProvider as NavigationTheme } from "expo-router";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppProvider } from "@/lib/app-state";
import { ThemeProvider } from "@/lib/theme";

/* eslint-disable @typescript-eslint/no-require-imports */
const FONTS = {
  CormorantGaramond_600SemiBold: require("../assets/fonts/CormorantGaramond-SemiBold.woff2"),
  CormorantGaramond_700Bold: require("../assets/fonts/CormorantGaramond-Bold.woff2"),
  Manrope_400Regular: require("../assets/fonts/Manrope-Regular.woff2"),
  Manrope_600SemiBold: require("../assets/fonts/Manrope-SemiBold.woff2"),
  Manrope_800ExtraBold: require("../assets/fonts/Manrope-ExtraBold.woff2"),
};

// The navigator paints its own pale background unless told otherwise; the design draws its own.
const SEE_THROUGH = { ...DefaultTheme, dark: true, colors: { ...DefaultTheme.colors, background: "transparent", card: "transparent", border: "transparent" } };

export default function RootLayout() {
  // The fonts are tiny and load in the background. The app never waits for them: text
  // simply switches to the gold serif the moment they arrive.
  useFonts(FONTS);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationTheme value={SEE_THROUGH}>
        <AppProvider>
        <Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: "transparent" } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
        </AppProvider>
        </NavigationTheme>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
