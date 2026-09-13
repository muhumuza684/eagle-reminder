import AsyncStorage from "@/lib/secure-storage";

const EXPORT_VERSION = 1;

export type LocalBackup = {
  app: "d-eagle-hub";
  version: number;
  exportedAt: string;
  values: Record<string, string>;
};

export async function exportLocalData(): Promise<string> {
  const keys = await AsyncStorage.getAllKeys();
  const localKeys = keys.filter((key) => key.startsWith("deagle-"));

  const pairs = await AsyncStorage.multiGet(localKeys);
  const values: Record<string, string> = {};

  for (const [key, value] of pairs) {
    if (value !== null) {
      values[key] = value;
    }
  }

  return JSON.stringify(
    {
      app: "d-eagle-hub",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      values,
    } satisfies LocalBackup,
    null,
    2,
  );
}

export async function importLocalData(json: string): Promise<number> {
  const parsed = JSON.parse(json) as LocalBackup;

  if (
    !parsed ||
    parsed.app !== "d-eagle-hub" ||
    typeof parsed.values !== "object" ||
    parsed.values === null
  ) {
    throw new Error("Invalid D-Eagle Hub backup.");
  }

  const entries = Object.entries(parsed.values).filter(
    ([key, value]) =>
      key.startsWith("deagle-") && typeof value === "string",
  );

  await AsyncStorage.multiSet(entries);
  return entries.length;
}

export async function clearLocalData(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const localKeys = keys.filter((key) => key.startsWith("deagle-"));
  await AsyncStorage.multiRemove(localKeys);
}
