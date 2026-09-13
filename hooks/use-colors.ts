import { useColorScheme } from "@/components/useColorScheme";
import { themeColors } from "@/theme.config.js";

type ColorToken = keyof typeof themeColors;
type Colors = { [K in ColorToken]: string };

export function useColors(): Colors {
  const scheme = useColorScheme() ?? "light";
  const colors = {} as Colors;
  for (const key in themeColors) {
    const token = key as ColorToken;
    colors[token] = themeColors[token][scheme as "light" | "dark"];
  }
  return colors;
}
