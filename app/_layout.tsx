import "react-native-get-random-values";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as Linking from "expo-linking";
import { useFonts } from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { AuthGate } from "@/components/auth-gate";
import { completeOAuthFromUrl } from "@/lib/_core/auth";

function DeepLinkAuthListener() {
  const utils = trpc.useUtils();

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const completed = await completeOAuthFromUrl(url);
      if (completed) utils.auth.me.invalidate();
    };
    Linking.getInitialURL().then((url) => { if (url) handleUrl(url); });
    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, [utils]);

  return null;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() => createTRPCClient());
  // Fixes blank/tofu icons on web static export: vector-icon fonts don't
  // reliably load from node_modules on web unless explicitly requested via
  // expo-font first. Gate rendering on it the same way splash-screen-based
  // font loading normally does, so nothing paints an icon before the font
  // is actually available.
  const [iconsLoaded] = useFonts({ ...Ionicons.font });

  if (!iconsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <DeepLinkAuthListener />
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
          <Stack.Screen name="about" options={{ title: "About", headerShown: true }} />
            </Stack>
          </AuthGate>
        </QueryClientProvider>
      </trpc.Provider>
    </SafeAreaProvider>
  );
}



