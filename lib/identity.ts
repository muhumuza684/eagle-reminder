import * as Crypto from "expo-crypto";

/** Stable client identity for local-first entities. Never use timestamps as IDs. */
export function createClientId(): string {
  return Crypto.randomUUID();
}

export function isClientId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
