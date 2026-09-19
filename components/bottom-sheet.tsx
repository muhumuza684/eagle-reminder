import { useRef, useState } from "react";
import { View, Text, Pressable, PanResponder, Animated, StyleSheet, Dimensions } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { spacing } from "@/constants/spacing";

/**
 * INTEGRATION NOTE -- generic drag sheet, no external dependency (a
 * library like @gorhom/bottom-sheet is smoother but adds a native
 * dependency; this manual version needs nothing new installed). Put your
 * remaining today-commitments list as `peekContent` (shown collapsed)
 * and your full Review screen content as `expandedContent` (shown once
 * dragged up). The grab handle and peek are load-bearing per the
 * research: an invisible gesture does not exist to the user.
 */

const SCREEN_HEIGHT = Dimensions.get("window").height;
const COLLAPSED_HEIGHT = 180;
const EXPANDED_HEIGHT = Math.round(SCREEN_HEIGHT * 0.82);

export function CommitmentSheet({
  dayCount,
  onDayCountPress,
  peekContent,
  expandedContent,
}: {
  dayCount: string; // e.g. "3/6"
  onDayCountPress?: () => void;
  peekContent: React.ReactNode;
  expandedContent: React.ReactNode;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const height = useRef(new Animated.Value(COLLAPSED_HEIGHT)).current;

  const animateTo = (target: number, isExpanded: boolean) => {
    Animated.spring(height, { toValue: target, useNativeDriver: false, bounciness: 4 }).start();
    setExpanded(isExpanded);
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => Math.abs(gesture.dy) > 6,
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy < -30) animateTo(EXPANDED_HEIGHT, true);
        else if (gesture.dy > 30) animateTo(COLLAPSED_HEIGHT, false);
      },
    }),
  ).current;

  return (
    <Animated.View style={[styles.sheet, { height, backgroundColor: colors.surface }]}>
      <View {...panResponder.panHandlers} style={styles.handleArea}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        <View style={styles.headerRow}>
          <Text style={{ fontSize: 12, color: colors.muted }}>
            {expanded ? "Nightly review" : "More today"}
          </Text>
          <Pressable onPress={onDayCountPress} hitSlop={8}>
            <Text style={{ fontSize: 12, color: colors.primary }}>{dayCount}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.body}>{expanded ? expandedContent : peekContent}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" },
  handleArea: { paddingTop: spacing.sm, paddingBottom: spacing.sm },
  handle: { width: 32, height: 3, borderRadius: 2, alignSelf: "center", marginBottom: spacing.sm },
  headerRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  body: { flex: 1, paddingHorizontal: spacing.lg },
});

