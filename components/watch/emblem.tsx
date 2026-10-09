import Svg, { Circle, Path } from "react-native-svg";
import { useTheme } from "@/lib/theme";
import { EAGLE_PATH } from "./eagle-path";

/** The D-Eagle mark: the eagle inside a double gold ring (plain colours, no gradients). */
export function Emblem({ size }: { size: number }) {
  const { finish: c } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="D-Eagle">
      <Circle cx="50" cy="50" r="48" fill="none" stroke={c.m1} strokeWidth={2.2} />
      <Circle cx="50" cy="50" r="43" fill="none" stroke={c.m2} strokeWidth={0.8} />
      <Path d={EAGLE_PATH} fill={c.m1} fillRule="evenodd" transform="translate(17 17) scale(0.132)" />
    </Svg>
  );
}
