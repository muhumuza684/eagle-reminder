export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? process.env.EXPO_PUBLIC_OWNER_OPEN_ID ?? "",
  oauthPortalUrl: process.env.OAUTH_PORTAL_URL ?? process.env.EXPO_PUBLIC_OAUTH_PORTAL_URL ?? "",
  oauthServerUrl: process.env.OAUTH_SERVER_URL ?? process.env.EXPO_PUBLIC_OAUTH_SERVER_URL ?? "",
  appId: process.env.APP_ID ?? process.env.EXPO_PUBLIC_APP_ID ?? "",
  sessionSecret: process.env.SESSION_SECRET ?? "development-session-secret",
  nodeEnv: process.env.NODE_ENV ?? "development",
} as const;
