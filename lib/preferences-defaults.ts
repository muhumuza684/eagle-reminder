export type EaglePreferences = {
  notificationsEnabled: boolean;
  voiceEnabled: boolean;
  meetingChimeMuted: boolean;
  earlyWarningMuted: boolean;
  briefingHour: number;
  reviewHour: number;
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
  briefingHour: 8,
  reviewHour: 22,
  shareTheme: "Signal",
  quietHoursStart: 22,
  quietHoursEnd: 7,
  reminderFrequency: 1,
};


