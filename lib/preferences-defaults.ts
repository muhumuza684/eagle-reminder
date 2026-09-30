export type EaglePreferences = {
  notificationsEnabled: boolean;
  voiceEnabled: boolean;
  meetingChimeMuted: boolean;
  earlyWarningMuted: boolean;
  shareTheme: string;
  quietHoursStart: number;
  quietHoursEnd: number;
  reminderFrequency: 1 | 2 | 3;
};

export const DEFAULT_PREFERENCES: EaglePreferences = {
  notificationsEnabled: true,
  voiceEnabled: true,
  meetingChimeMuted: false,
  earlyWarningMuted: false,
  shareTheme: "Signal",
  quietHoursStart: 22,
  quietHoursEnd: 7,
  reminderFrequency: 1,
};


