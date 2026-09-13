import { ReactNode } from "react";
import { View, ViewStyle, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";

type ScreenContainerProps = {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  maxWidth?: number;
};

const CONTENT_CLASSES: Record<string, ViewStyle> = {
  "px-5": { paddingHorizontal: 20 },
};

const MAX_CONTENT_WIDTH = 640;
const WIDE_BREAKPOINT = 720;

export function ScreenContainer({ children, className, containerClassName, maxWidth }: ScreenContainerProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;
  const containerStyle: ViewStyle = containerClassName === "bg-background" ? { backgroundColor: colors.background } : {};
  const contentStyle: ViewStyle = (className && CONTENT_CLASSES[className]) || {};
  const effectiveMaxWidth = maxWidth ?? MAX_CONTENT_WIDTH;

  return (
    <SafeAreaView style={[{ flex: 1 }, containerStyle]} edges={["top"]}>
      <View style={{ flex: 1, alignItems: isWide ? "center" : "stretch" }}>
        <View style={[{ flex: 1, width: "100%" }, isWide ? { maxWidth: effectiveMaxWidth } : null, contentStyle]}>
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}