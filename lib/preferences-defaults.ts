export type EaglePreferences = {
  notificationsEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
};

export const DEFAULT_PREFERENCES: EaglePreferences = {
  notificationsEnabled: true,
  quietHoursStart: 22,
  quietHoursEnd: 7,
};