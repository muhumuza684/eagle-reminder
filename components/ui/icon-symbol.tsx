import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Platform, type ColorValue, type StyleProp, type ViewStyle } from "react-native";

const MAPPING = {
  "house.fill": "home",
  "moon.fill": "nightlight",
  "chart.bar.fill": "bar-chart",
  "gearshape.fill": "settings",
  "plus": "add",
  "checkmark": "check",
  "xmark": "close",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "trash": "delete",
  "pencil": "edit",
  "bell.fill": "notifications",
  "person.fill": "person",
  "calendar": "calendar-today",
  "clock": "access-time",
  "arrow.right": "arrow-forward",
  "arrow.left": "arrow-back",
  "magnifyingglass": "search",
  "ellipsis": "more-horiz",
} as const;

type IconName = keyof typeof MAPPING;

type Props = Omit<SymbolViewProps, "name"> & {
  name: IconName;
  size?: number;
  color?: ColorValue;
  style?: StyleProp<ViewStyle>;
};

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
  ...symbolProps
}: Props) {
  if (Platform.OS === "ios") {
    return (
      <SymbolView
        {...symbolProps}
        name={name as never}
        size={size}
        tintColor={color}
        style={style as never}
      />
    );
  }

  return (
    <MaterialIcons
      name={MAPPING[name] as never}
      size={size}
      color={color as string}
      style={style as never}
    />
  );
}

