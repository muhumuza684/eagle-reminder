// Tier 3 #12 — actual send logic, using the real `expo-server-sdk` (not a
// stub — it's a listed dependency; see package.json). This is the piece
// that genuinely needs no additional secrets or credentials to run: Expo's
// push service brokers to APNs/FCM using the Expo push token itself, with
// the app's push credentials already configured at EAS build time — so
// unlike raw APNs/FCM, there's no separate certificate/key management this
// code needs to own.
//
// What this file deliberately does NOT do: decide who's due (that's
// pushSchedule.ts, kept pure/testable) or read from the database directly
// (that's db.ts) — it only takes a batch of already-decided sends and talks
// to Expo.

import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import type { DuePush } from "./pushSchedule";
import { log } from "./logger";

const expo = new Expo();

export type PushContent = { title: string; body: string; route?: string };

/** What each push actually says. Kept separate from selectDuePushes so the copy can change without touching the scheduling decision. */
export function contentFor(kind: DuePush["kind"], openCount: number): PushContent {
  if (kind === "briefing") {
    return {
      title: "Good morning from Eagle",
      body: openCount > 0 ? `${openCount} commitment${openCount === 1 ? "" : "s"} today. Eagle's got the rest.` : "A clear day — Eagle will let you know if that changes.",
      route: "/",
    };
  }
  return {
    title: "Nightly Review",
    body: openCount > 0 ? `${openCount} still open — close the loop before midnight.` : "Nothing left open today. Well carried.",
    route: "/review",
  };
}

/**
 * Sends a batch of already-decided pushes. Returns which token ids
 * succeeded (so the caller can call markBriefingSent/markReviewSent) and
 * which tokens Expo reported as permanently invalid (so the caller can
 * call deletePushTokenByValue) — receipt-checking for invalid tokens is
 * the standard Expo pattern, not optional polish: without it, a token from
 * an uninstalled app gets retried forever.
 */
export async function sendPushes(pushes: Array<DuePush & { content: PushContent }>): Promise<{ sentTokenIds: number[]; invalidTokens: string[] }> {
  const sentTokenIds: number[] = [];
  const invalidTokens: string[] = [];

  const validPushes = pushes.filter((push) => {
    if (Expo.isExpoPushToken(push.token)) return true;
    log({ event: "push.invalid_token_format", level: "warn", userId: push.userId, token: push.token });
    invalidTokens.push(push.token);
    return false;
  });
  if (validPushes.length === 0) return { sentTokenIds, invalidTokens };

  const messages: ExpoPushMessage[] = validPushes.map((push) => ({
    to: push.token,
    title: push.content.title,
    body: push.content.body,
    data: { route: push.content.route ?? "/", kind: push.kind },
    sound: "default",
  }));

  const chunks = expo.chunkPushNotifications(messages);
  const tickets: ExpoPushTicket[] = [];
  for (const chunk of chunks) {
    try {
      tickets.push(...(await expo.sendPushNotificationsAsync(chunk)));
    } catch (error) {
      log({ event: "push.chunk_send_failed", level: "error", message: error instanceof Error ? error.message : String(error) });
      // This chunk's pushes are simply not marked sent — they'll be
      // re-evaluated as still-due on the job's next run rather than lost.
    }
  }

  tickets.forEach((ticket, index) => {
    const push = validPushes[index];
    if (!push) return;
    if (ticket.status === "ok") {
      sentTokenIds.push(push.tokenId);
    } else {
      log({ event: "push.ticket_error", level: "warn", userId: push.userId, message: ticket.message, details: ticket.details });
      if (ticket.details?.error === "DeviceNotRegistered") invalidTokens.push(push.token);
    }
  });

  return { sentTokenIds, invalidTokens };
}
