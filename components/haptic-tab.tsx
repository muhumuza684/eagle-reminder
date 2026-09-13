import * as Haptics from "expo-haptics";
import { Platform, Pressable } from "react-native";

export function HapticTab(props: any) {
  const { onPressIn, ...rest } = props;

  return (
    <Pressable
      {...rest}
      onPressIn={(event) => {
        if (Platform.OS === "ios") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        onPressIn?.(event);
      }}
    />
  );
}
