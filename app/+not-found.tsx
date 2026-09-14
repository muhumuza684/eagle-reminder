import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Title, Body } from "@/components/ui/primitives";
import { useColors } from "@/hooks/use-colors";
import { spacing } from "@/constants/spacing";

export default function NotFoundScreen() {
  const c = useColors();
  return (
    <>
      <Stack.Screen options={{ title: "Not found" }} />
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <Title>This screen doesn't exist.</Title>
        <Link href="/" style={styles.link}>
          <Body color={c.primary}>Go to home screen</Body>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xxl, gap: spacing.md },
  link: { marginTop: spacing.sm },
});