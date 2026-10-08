import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_PREFERENCES, type EaglePreferences, type FinishKey } from "@/lib/preferences-defaults";
import { getLocalPreferences, setLocalPreferences } from "@/lib/preferences";

export type Palette = {
  name: string;
  b0: string; // deepest background
  b1: string; // lifted background
  m1: string; // bright metal
  m2: string; // deep metal
  gem: string; // the one gem colour
  ink: string;
  mut: string;
  bd: string; // hairline borders
  cd: string; // card fill
  warn: string;
};

const alpha = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

const RAW: Record<FinishKey, Omit<Palette, "bd" | "cd" | "warn">> = {
  champagne: { name: "Champagne Gold", b0: "#090706", b1: "#241a10", m1: "#f2dba5", m2: "#a8803f", gem: "#2aa6a0", ink: "#f3e9d2", mut: "#a39069" },
  rose: { name: "Rose Gold", b0: "#0a0607", b1: "#2a1518", m1: "#f6c9b6", m2: "#b0675a", gem: "#d94a76", ink: "#f8e6de", mut: "#aa8379" },
  emerald: { name: "Emerald & Gold", b0: "#050a08", b1: "#10261d", m1: "#ead69c", m2: "#9a7d3a", gem: "#2fb584", ink: "#eef0df", mut: "#8fa392" },
  sapphire: { name: "Sapphire & Platinum", b0: "#020a10", b1: "#0b2a3d", m1: "#e4ecf1", m2: "#8da2b0", gem: "#78bdc4", ink: "#eef6fa", mut: "#8eaab8" },
  ruby: { name: "Ruby & Gold", b0: "#0c0405", b1: "#2b0d12", m1: "#f0d38d", m2: "#a67a36", gem: "#e0334a", ink: "#f7e8dc", mut: "#b08a82" },
};

export const FINISH_KEYS = Object.keys(RAW) as FinishKey[];

export function paletteFor(key: FinishKey): Palette {
  const base = RAW[key] ?? RAW.champagne;
  return { ...base, bd: alpha(base.m1, 0.28), cd: alpha(base.m1, 0.06), warn: "#F8444F" };
}

type ThemeValue = {
  prefs: EaglePreferences;
  finish: Palette;
  setPrefs: (patch: Partial<EaglePreferences>) => Promise<void>;
};

const ThemeContext = createContext<ThemeValue>({
  prefs: DEFAULT_PREFERENCES,
  finish: paletteFor(DEFAULT_PREFERENCES.finish),
  setPrefs: async () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefsState] = useState<EaglePreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    getLocalPreferences().then(setPrefsState).catch(() => undefined);
  }, []);

  const setPrefs = useCallback(async (patch: Partial<EaglePreferences>) => {
    setPrefsState((current) => ({ ...current, ...patch }));
    await setLocalPreferences(patch);
  }, []);

  const value = useMemo(() => ({ prefs, finish: paletteFor(prefs.finish), setPrefs }), [prefs, setPrefs]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
