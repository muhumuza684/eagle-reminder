const values = new Map<string, string>();

const storage = {
  async getItem(key: string): Promise<string | null> {
    return values.get(key) ?? null;
  },

  async setItem(key: string, value: string): Promise<void> {
    values.set(key, value);
  },

  async removeItem(key: string): Promise<void> {
    values.delete(key);
  },

  async getAllKeys(): Promise<string[]> {
    return Array.from(values.keys());
  },

  async multiGet(
    keys: readonly string[],
  ): Promise<readonly [string, string | null][]> {
    return keys.map((key) => [key, values.get(key) ?? null]);
  },

  async multiSet(
    pairs: readonly [string, string][],
  ): Promise<void> {
    for (const [key, value] of pairs) {
      values.set(key, value);
    }
  },

  async multiRemove(keys: readonly string[]): Promise<void> {
    for (const key of keys) {
      values.delete(key);
    }
  },
};

export default storage;
export const getItem = storage.getItem;
export const setItem = storage.setItem;
export const removeItem = storage.removeItem;
export const getAllKeys = storage.getAllKeys;
export const multiGet = storage.multiGet;
export const multiSet = storage.multiSet;
export const multiRemove = storage.multiRemove;
