import { Stack } from "expo-router";
import { AppShell } from "@/components/app-shell";

export default function TabLayout() {
  return (
    <AppShell>
      <Stack screenOptions={{ headerShown: false }} />
    </AppShell>
  );
}
