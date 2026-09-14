import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import * as Linking from "expo-linking";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { trpc, createTRPCClient } from "@/lib/trpc";
import { AuthGate } from "@/components/auth-gate";
import { completeOAuthFromUrl } from "@/lib/_core/auth";
import { useFonts } from "expo-font";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

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
  useFonts({ ...MaterialIcons.font });

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
