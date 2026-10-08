import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useTheme } from "@/lib/theme";
import { EAGLE_PATH } from "./eagle-path";

/** The D-Eagle mark: the eagle inside a double gold ring. */
export function Emblem({ size }: { size: number }) {
  const { finish: c } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel="D-Eagle">
      <Defs>
        <LinearGradient id="emg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={c.m1} />
          <Stop offset="0.55" stopColor={c.m2} />
          <Stop offset="1" stopColor={c.m1} />
        </LinearGradient>
      </Defs>
      <Circle cx="50" cy="50" r="48" fill="none" stroke="url(#emg)" strokeWidth={2.2} />
      <Circle cx="50" cy="50" r="43" fill="none" stroke="url(#emg)" strokeWidth={0.6} />
      <Path d={EAGLE_PATH} fill="url(#emg)" fillRule="evenodd" transform="translate(17 17) scale(0.132)" />
    </Svg>
  );
}
