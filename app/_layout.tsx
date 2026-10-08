import "react-native-get-random-values";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CormorantGaramond_600SemiBold } from "@expo-google-fonts/cormorant-garamond/600SemiBold";
import { CormorantGaramond_700Bold } from "@expo-google-fonts/cormorant-garamond/700Bold";
import { useFonts as useSerif } from "@expo-google-fonts/cormorant-garamond/useFonts";
import { Manrope_400Regular } from "@expo-google-fonts/manrope/400Regular";
import { Manrope_600SemiBold } from "@expo-google-fonts/manrope/600SemiBold";
import { Manrope_800ExtraBold } from "@expo-google-fonts/manrope/800ExtraBold";
import { useFonts as useSans } from "@expo-google-fonts/manrope/useFonts";
import { ThemeProvider } from "@/lib/theme";

export default function RootLayout() {
  // If a font cannot load, the app still opens with the system font instead of a blank screen.
  const [serifReady, serifError] = useSerif({ CormorantGaramond_600SemiBold, CormorantGaramond_700Bold });
  const [sansReady, sansError] = useSans({ Manrope_400Regular, Manrope_600SemiBold, Manrope_800ExtraBold });

  // Never sit on a blank screen: after a few seconds the app opens even if a font is still loading.
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!waited && (!(serifReady || serifError) || !(sansReady || sansError))) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Stack screenOptions={{ headerShown: false, animation: "none" }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
