export type SceneKey = "orbit" | "spring" | "express";
export type FinishKey = "champagne" | "rose" | "emerald" | "sapphire" | "ruby";
export type RingtoneKey = "crystal" | "marimba" | "glass" | "musicbox";

export type EaglePreferences = {
  notificationsEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  scene: SceneKey;
  finish: FinishKey;
  ringtone: RingtoneKey;
};

export const DEFAULT_PREFERENCES: EaglePreferences = {
  notificationsEnabled: true,
  quietHoursStart: 22,
  quietHoursEnd: 7,
  scene: "orbit",
  finish: "champagne",
  ringtone: "crystal",
};
