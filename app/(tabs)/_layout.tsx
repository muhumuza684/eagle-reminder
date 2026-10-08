import { Stack } from "expo-router";
import { AppShell } from "@/components/app-shell";

export default function TabLayout() {
  // Screens must be see-through, or the navigator paints its own pale background over the design.
  return (
    <AppShell>
      <Stack screenOptions={{ headerShown: false, animation: "none", contentStyle: { backgroundColor: "transparent" } }} />
    </AppShell>
  );
}
