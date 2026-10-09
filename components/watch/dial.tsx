import { useEffect, useMemo, useRef, useState } from "react";
import Svg, { Circle, Ellipse, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";
import { FONT } from "@/constants/fonts";
import type { SceneKey } from "@/lib/preferences-defaults";
import { useTheme } from "@/lib/theme";
import { ARC_LENGTH, LANE, SPRING_SPAN, ang, arcPath, pose, springProgress, trailAngles, xy } from "@/lib/watch";

export type DialGoal = { at: Date; selected: boolean };

type Props = {
  size: number;
  scene: SceneKey;
  goals: DialGoal[];
  /** The reminder the watch follows. */
  current: Date | null;
  /** The time being chosen right now; shown as a hollow gem so you see where it will land. */
  draft: Date | null;
  /** When set, the dial runs a compressed preview that ends at this moment. */
  demoUntil: number | null;
  ringing: boolean;
  flip: { day: string; date: string; month: string };
};

const PREVIEW_GOAL = 120;

// Plain colours only: no gradient or clip references, so nothing can fail to draw.
export function Dial({ size, scene, goals, current, draft, demoUntil, ringing, flip }: Props) {
  const { finish: c } = useTheme();
  const [now, setNow] = useState(() => Date.now());
  const last = useRef(now);
  const cage = useRef(0);
  const flipKey = useRef("");
  const flipAt = useRef(0);

  useEffect(() => {
    // About 20 frames a second is smooth enough and kind to phones; idle while the tab is hidden.
    const id = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setNow(Date.now());
    }, 50);
    return () => clearInterval(id);
  }, []);

  const dt = Math.min(120, now - last.current);
  last.current = now;
  const preview = current == null && demoUntil != null;
  const goal = current ? ang(current) : preview ? PREVIEW_GOAL : 0;
  const tau =
    demoUntil != null ? Math.max(0, (demoUntil - now) / 1000) : current ? Math.max(0, (current.getTime() - now) / 1000) : 1e6 - now / 1000;
  const head = pose(scene, tau, goal);
  const wound = springProgress(tau, demoUntil != null ? 20 : 60);
  cage.current = (cage.current + (dt / 1000) * (360 / (scene === "spring" ? 6 - 5 * wound : 6))) % 360;

  const flipId = `${flip.day}${flip.date}${flip.month}`;
  if (flipKey.current !== flipId) {
    flipKey.current = flipId;
    flipAt.current = now;
  }
  const flipK = Math.min(1, (now - flipAt.current) / 450);

  const ticks = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => {
        const minor = i % 5 !== 0;
        const r = minor ? 126 : 121;
        const rad = (i * Math.PI) / 30;
        return (
          <Line
            key={i}
            x1={150 + Math.sin(rad) * r}
            y1={150 - Math.cos(rad) * r}
            x2={150 + Math.sin(rad) * 132}
            y2={150 - Math.cos(rad) * 132}
            stroke={c.m1}
            strokeOpacity={0.75}
            strokeWidth={minor ? 0.8 : 2}
          />
        );
      }),
    [c.m1],
  );

  const time = new Date(now);
  const timeText = `${time.getHours() % 12 || 12}:${String(time.getMinutes()).padStart(2, "0")}`;
  const marks = goals.map((item) => ({ deg: ang(item.at), selected: item.selected }));
  if (preview) marks.push({ deg: goal, selected: true });

  const cards = [flip.day, flip.date, flip.month];
  const arc = scene === "spring" ? arcPath(goal) : "";
  const [bx, by] = xy(goal - SPRING_SPAN + SPRING_SPAN * wound, LANE);
  const draftDeg = draft ? ang(draft) : null;
  const [dx, dy] = xy(draftDeg ?? 0, LANE);

  return (
    <Svg width={size} height={size} viewBox="0 0 300 300" style={{ overflow: "visible" }} accessibilityLabel="Watch face">
      <G transform={`rotate(${((now / 240000) * 360) % 360} 150 150)`}>{ticks}</G>
      <Circle cx={150} cy={150} r={117} fill="none" stroke={c.m1} strokeWidth={1.4} />
      <Circle cx={150} cy={150} r={114} fill="none" stroke={c.m2} strokeWidth={0.6} />
      <Circle cx={150} cy={150} r={LANE} fill="none" stroke={c.bd} strokeWidth={1} strokeDasharray="1.5 4" strokeDashoffset={-((now / 1200) % 1) * 5.5} />
      <G transform={`rotate(${((now % 60000) / 60000) * 360} 150 150)`}>
        <Line x1={150} y1={150} x2={150} y2={48} stroke={c.gem} strokeWidth={1} />
        <Circle cx={150} cy={44} r={3} fill={c.gem} />
      </G>

      {/* globe: a shaded sphere with turning meridians */}
      <G transform="translate(150 70)">
        <Circle r={17} fill={c.b0} />
        <Circle r={16} fill={c.gem} opacity={0.5} />
        <Circle r={11} cx={-3} cy={-3} fill={c.gem} opacity={0.45} />
        <Circle r={5} cx={-6} cy={-6} fill="#ffffff" opacity={0.2} />
        <Ellipse rx={Math.abs(Math.cos((now / 7000) * Math.PI)) * 16} ry={16} fill="none" stroke={c.m1} opacity={0.55} />
        <Ellipse rx={Math.abs(Math.cos((now / 7000) * Math.PI + Math.PI / 2)) * 16} ry={16} fill="none" stroke={c.m1} opacity={0.55} />
        <Path d="M-16 0H16" stroke={c.m1} opacity={0.35} />
        <Circle r={17} fill="none" stroke={c.m1} strokeWidth={1.4} />
      </G>

      {/* tourbillon */}
      <G transform="translate(150 236)">
        <Circle r={15} fill="none" stroke={c.bd} />
        <G transform={`rotate(${cage.current})`}>
          <Circle r={12} fill="none" stroke={c.m1} strokeWidth={1} />
          <Path d="M0-12V12M-12 0H12" stroke={c.m1} strokeWidth={1} />
          <Circle cx={7} cy={-7} r={3} fill={c.gem} />
        </G>
        <Circle r={15} fill="none" stroke={c.m1} strokeWidth={1.4} />
      </G>

      {/* the time you are choosing: a hollow gem where it will land */}
      {draftDeg != null ? (
        <G transform={`translate(${dx} ${dy}) rotate(${draftDeg + 180})`}>
          <Circle r={9} fill="none" stroke={c.m1} strokeDasharray="2 2" />
          <Path d="M0-6L5-2L0 6L-5-2Z" fill="none" stroke={c.m1} strokeWidth={1.3} />
        </G>
      ) : null}

      {/* goals: a gem (or the station arch) at each reminder's time */}
      {marks.map((mark, index) => {
        const [x, y] = xy(mark.deg, LANE);
        if (!mark.selected) return <Circle key={index} cx={x} cy={y} r={2.4} fill={c.gem} />;
        const ripples = [0, 0.5].map((offset) => {
          const phase = (now / 1200 + offset) % 1;
          return <Circle key={offset} r={5 * (1 + 4 * phase)} fill="none" stroke={c.m1} strokeWidth={1} opacity={ringing ? 0.9 * (1 - phase) : 0} />;
        });
        if (scene === "express") {
          return (
            <G key={index} transform={`translate(${x} ${y}) rotate(${mark.deg})`}>
              <Path d="M-15 4H15M-12 4V-4Q0-13 12-4V4" fill="none" stroke={c.m1} strokeWidth={1.6} />
              {ripples}
            </G>
          );
        }
        const pulse = 1 + (ringing ? 0.5 * Math.abs(Math.sin(now / 300)) : 0);
        return (
          <G key={index} transform={`translate(${x} ${y}) rotate(${mark.deg + 180})`}>
            <Circle r={7.5} fill="none" stroke={c.bd} />
            <G transform={`scale(${pulse})`}>
              <Path d="M0-6L5-2L0 6L-5-2Z" fill={c.m1} stroke={c.m2} strokeWidth={0.6} />
              <Path d="M-5-2H5M-2-2L0-6L2-2L0 6Z" fill="none" stroke={c.m2} strokeWidth={0.8} />
            </G>
            {ripples}
          </G>
        );
      })}

      {/* the moving part */}
      {scene === "orbit" &&
        trailAngles(head).map((deg, i) => {
          const [x, y] = xy(deg, LANE);
          return (
            <G key={i}>
              {i === 0 ? <Circle cx={x} cy={y} r={8} fill={c.m1} opacity={0.18} /> : null}
              <Circle cx={x} cy={y} r={4.4 - i * 0.28} fill={c.m1} opacity={1 - i * 0.08} />
            </G>
          );
        })}
      {scene === "spring" && (
        <>
          <Path d={arc} fill="none" stroke={c.bd} strokeWidth={3.2} />
          <Path d={arc} fill="none" stroke={c.m1} strokeWidth={3.2} strokeLinecap="round" strokeDasharray={`${wound * ARC_LENGTH} ${ARC_LENGTH * 2}`} />
          <Circle cx={bx} cy={by} r={4.2} fill={c.m1} />
        </>
      )}
      {scene === "express" &&
        [0, 1, 2].map((i) => {
          const deg = head - i * 11;
          const [x, y] = xy(deg, LANE);
          return (
            <G key={i} transform={`translate(${x} ${y}) rotate(${deg}) scale(1.3)`}>
              {i === 0 ? (
                <>
                  <Path d="M-10 3.5V-2.5Q-10-5-7.5-5H3Q8-5 11 0V3.5Z" fill={c.m1} />
                  <Path d="M-6-3H2" stroke={c.b0} strokeWidth={1.6} strokeLinecap="round" />
                  <Circle cx={11} cy={0} r={2.2} fill={c.gem} />
                </>
              ) : (
                <>
                  <Rect x={-8} y={-4} width={16} height={7.5} rx={2} fill={c.m1} opacity={i === 1 ? 0.88 : 0.7} />
                  <Path d="M-5-1.5H5" stroke={c.b0} strokeWidth={1.4} strokeLinecap="round" />
                </>
              )}
            </G>
          );
        })}

      {/* time and the date window */}
      <SvgText x={150} y={140} fontSize={52} fontFamily={FONT.display} fill={c.m1} textAnchor="middle">
        {timeText}
      </SvgText>
      {cards.map((text, i) => {
        const x = 78 + i * 50;
        return (
          <G key={i}>
            <Rect x={x} y={158} width={44} height={32} rx={6} fill={c.cd} stroke={c.bd} />
            <Circle cx={x} cy={174} r={1.6} fill={c.m2} />
            <Circle cx={x + 44} cy={174} r={1.6} fill={c.m2} />
            <G opacity={flipK} transform={`translate(0 174) scale(1 ${0.15 + 0.85 * flipK}) translate(0 -174)`}>
              <SvgText x={x + 22} y={180} fontSize={17} fontFamily={FONT.displayBold} fill={c.m1} textAnchor="middle">
                {text}
              </SvgText>
            </G>
          </G>
        );
      })}
    </Svg>
  );
}
