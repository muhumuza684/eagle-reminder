import type { default as NativeSecureStorage } from './secure-storage.native';

export type SecureStorageApi = typeof NativeSecureStorage;

const local = new Map<string, string>();

const api = {
  async getItem(key: string) { return local.get(key) ?? null; },
  async setItem(key: string, value: string) { local.set(key, value); },
  async removeItem(key: string) { local.delete(key); },
  async getAllKeys() { return [...local.keys()]; },
  async multiGet(keys: readonly string[]) { return keys.map((key) => [key, local.get(key) ?? null] as [string, string | null]); },
  async multiSet(pairs: readonly [string, string][]) { for (const [key, value] of pairs) local.set(key, value); },
  async multiRemove(keys: readonly string[]) { for (const key of keys) local.delete(key); },
};

export default api;
export const getItem = api.getItem;
export const setItem = api.setItem;
export const removeItem = api.removeItem;
export const getAllKeys = api.getAllKeys;
export const multiGet = api.multiGet;
export const multiSet = api.multiSet;
export const multiRemove = api.multiRemove;
