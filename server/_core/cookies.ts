import { COOKIE_NAME } from "../../shared/const";
import { ENV } from "./env";
import type { RequestLike } from "./context";

export function getSessionCookieOptions(_req?: RequestLike) {
  return {
    httpOnly: true,
    secure: ENV.nodeEnv === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

export function getSessionToken(req: RequestLike ): string | null {
  const authorization = req.headers?.authorization;

  if (typeof authorization === "string" && authorization.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim() || null;
  }

  return req.cookies?.[COOKIE_NAME] ?? null;
}

export { COOKIE_NAME };
