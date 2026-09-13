// Reusable safe JSON parsing for local persistence, per the project
// handoff letter section 4. Every persisted record should go through
// these instead of raw JSON.parse/JSON.stringify, so one malformed local
// record can never crash the whole app. This file was described in the
// handoff letter as already built; it was not actually present in the
// codebase - this is the real implementation.

import AsyncStorage from "@/lib/secure-storage";

export type SafeParseResult<T> = {
  value: T;
  recovered: boolean;
  error?: string;
};

export function parseJsonSafely<T>(
  raw: string | null | undefined,
  fallback: T,
  validate?: (value: unknown) => value is T
): SafeParseResult<T> {
  if (raw === null || raw === undefined || raw === "") {
    return { value: fallback, recovered: false };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return { value: fallback, recovered: true, error: error instanceof Error ? error.message : "Invalid JSON" };
  }
  if (validate && !validate(parsed)) {
    return { value: fallback, recovered: true, error: "Parsed JSON did not match the expected shape" };
  }
  return { value: parsed as T, recovered: false };
}

export function stringifyForStorage(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Reads and safely parses JSON from local storage under `key`. On
 * corruption, quarantines the original raw value under a sibling key
 * before returning the fallback, so it is inspectable later instead of
 * silently overwritten and lost.
 */
export async function readJsonSafely<T>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => value is T
): Promise<SafeParseResult<T>> {
  const raw = await AsyncStorage.getItem(key);
  const result = parseJsonSafely(raw, fallback, validate);
  if (result.recovered && raw) {
    await quarantineCorruptValue(key, raw, result.error);
  }
  return result;
}

export async function writeJsonSafely(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, stringifyForStorage(value));
}

export async function quarantineCorruptValue(key: string, raw: string, reason?: string): Promise<void> {
  try {
    const quarantineKey = `${key}:corrupt:${Date.now()}`;
    await AsyncStorage.setItem(quarantineKey, JSON.stringify({ originalKey: key, raw, reason, quarantinedAt: new Date().toISOString() }));
  } catch {
    // Best-effort safety net - if even this fails, the caller's fallback
    // value still keeps the app running rather than throwing.
  }
}
