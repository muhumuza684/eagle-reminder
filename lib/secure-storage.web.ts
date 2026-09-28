import CryptoJS from 'crypto-js';

const KEY_NAME = 'deagle-local-encryption-key-v1';
const ENCRYPTED_PREFIX = 'enc:v1:';
const fallback = new Map<string, string>();

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function storage() {
  return canUseBrowserStorage() ? window.localStorage : null;
}

function readMasterKey() {
  const local = storage();
  if (local) {
    const existing = local.getItem(KEY_NAME);
    if (existing) return existing;
    const generated = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
    local.setItem(KEY_NAME, generated);
    return generated;
  }

  const existing = fallback.get(KEY_NAME);
  if (existing) return existing;
  const generated = CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
  fallback.set(KEY_NAME, generated);
  return generated;
}

function readRaw(key: string) {
  return storage()?.getItem(key) ?? fallback.get(key) ?? null;
}

function writeRaw(key: string, value: string) {
  if (storage()) window.localStorage.setItem(key, value);
  else fallback.set(key, value);
}

function removeRaw(key: string) {
  storage()?.removeItem(key);
  fallback.delete(key);
}

function encrypt(value: string) {
  return `${ENCRYPTED_PREFIX}${CryptoJS.AES.encrypt(value, readMasterKey()).toString()}`;
}

function decrypt(value: string) {
  if (!value.startsWith(ENCRYPTED_PREFIX)) return value;
  const ciphertext = value.slice(ENCRYPTED_PREFIX.length);
  const bytes = CryptoJS.AES.decrypt(ciphertext, readMasterKey());
  const plaintext = bytes.toString(CryptoJS.enc.Utf8);
  if (!plaintext) throw new Error('Unable to decrypt local D-Eagle Hub data.');
  return plaintext;
}

export async function getItem(key: string) {
  const stored = readRaw(key);
  if (stored === null) return null;
  const plaintext = decrypt(stored);
  if (!stored.startsWith(ENCRYPTED_PREFIX)) await setItem(key, plaintext);
  return plaintext;
}

export async function setItem(key: string, value: string) {
  writeRaw(key, encrypt(value));
}

export async function removeItem(key: string) {
  removeRaw(key);
}

export async function getAllKeys() {
  const keys = new Set<string>(fallback.keys());
  const local = storage();
  if (local) {
    for (let index = 0; index < local.length; index += 1) {
      const key = local.key(index);
      if (key) keys.add(key);
    }
  }
  return [...keys];
}

export async function multiGet(keys: readonly string[]): Promise<readonly [string, string | null][]> {
  const result: [string, string | null][] = [];
  for (const key of keys) result.push([key, await getItem(key)]);
  return result;
}

export async function multiSet(pairs: readonly [string, string][]) {
  for (const [key, value] of pairs) await setItem(key, value);
}

export async function multiRemove(keys: readonly string[]) {
  for (const key of keys) removeRaw(key);
}

export default {
  getItem,
  setItem,
  removeItem,
  getAllKeys,
  multiGet,
  multiSet,
  multiRemove,
};
