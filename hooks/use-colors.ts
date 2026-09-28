import {
  D_EAGLE_COLORS,
  D_EAGLE_DARK_COLORS,
  type DEagleColorToken,
} from "@/constants/design-tokens";
import { useColorScheme } from "@/components/useColorScheme";

export type AppColors = {
  [K in DEagleColorToken]: string;
};

export function useColors(): AppColors {
  const scheme = useColorScheme() ?? "light";

  return scheme === "dark"
    ? D_EAGLE_DARK_COLORS
    : D_EAGLE_COLORS;
}
