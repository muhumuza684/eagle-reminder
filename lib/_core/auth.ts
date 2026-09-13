import AsyncStorage from "@/lib/secure-storage";
import { SESSION_TOKEN_KEY, getRedirectUri } from "@/constants/oauth";

/**
 * NOT part of any of the five exports this project was built from -
 * trpc.ts referenced lib/_core/auth.ts (getSessionToken) but it was never
 * actually provided anywhere, confirmed by checking every upload.
 *
 * getSessionToken/setSessionToken/clearSessionToken are safe and correct
 * regardless of the real OAuth contract - plain AsyncStorage read/write.
 *
 * completeOAuthFromUrl GUESSES the callback URL shape (a `token` query
 * param). This is the one part that needs verifying against the real
 * Manus OAuth server's actual callback response - if sign-in opens the
 * browser fine but never completes, this is almost certainly why.
 * On web, the backend's cookie-based session may work on its own even if
 * this token flow is wrong, since trpc.ts also sends credentials:
 * "include" independently of this file.
 */

export async function getSessionToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  await AsyncStorage.setItem(SESSION_TOKEN_KEY, token);
}

export async function clearSessionToken(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_TOKEN_KEY);
}

/** Best-effort - see file header. */
export async function completeOAuthFromUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get("token");
    if (!token) return false;
    await setSessionToken(token);
    return true;
  } catch {
    return false;
  }
}

export function getExpectedRedirectUri(): string {
  return getRedirectUri();
}

