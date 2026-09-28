import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import CryptoJS from "crypto-js";
import { Platform } from "react-native";

const KEY_NAME = "deagle-local-encryption-key-v1";
const ENCRYPTED_PREFIX = "enc:v1:";

function canUseBrowserStorage() {
  return (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

async function readMasterKey(): Promise<string> {
  if (Platform.OS !== "web") {
    const nativeKey = await SecureStore.getItemAsync(KEY_NAME);

    if (nativeKey) {
      return nativeKey;
    }

    const bytes = await Crypto.getRandomBytesAsync(32);
    const generated = Array.from(bytes)
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");

    await SecureStore.setItemAsync(KEY_NAME, generated, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });

    return generated;
  }

  if (canUseBrowserStorage()) {
    const browserKey = window.localStorage.getItem(KEY_NAME);

    if (browserKey) {
      return browserKey;
    }

    const bytes = await Crypto.getRandomBytesAsync(32);
    const generated = Array.from(bytes)
      .map((value) => value.toString(16).padStart(2, "0"))
      .join("");

    window.localStorage.setItem(KEY_NAME, generated);
    return generated;
  }

  // Fallback for unusual web/SSR environments.
  return "deagle-development-fallback-key";
}

async function encrypt(value: string): Promise<string> {
  const key = await readMasterKey();
  const ciphertext = CryptoJS.AES.encrypt(value, key).toString();
  return `${ENCRYPTED_PREFIX}${ciphertext}`;
}

async function decrypt(value: string): Promise<string> {
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    // Existing plaintext values remain readable and are migrated when written.
    return value;
  }

  const key = await readMasterKey();
  const ciphertext = value.slice(ENCRYPTED_PREFIX.length);
  const bytes = CryptoJS.AES.decrypt(ciphertext, key);
  const plaintext = bytes.toString(CryptoJS.enc.Utf8);

  if (!plaintext) {
    throw new Error("Unable to decrypt local D-Eagle Hub data.");
  }

  return plaintext;
}

async function getItem(key: string): Promise<string | null> {
  const stored = await AsyncStorage.getItem(key);

  if (stored === null) {
    return null;
  }

  const plaintext = await decrypt(stored);

  // Transparently migrate old plaintext values.
  if (!stored.startsWith(ENCRYPTED_PREFIX)) {
    await setItem(key, plaintext);
  }

  return plaintext;
}

async function setItem(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(key, await encrypt(value));
}

async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

async function getAllKeys(): Promise<string[]> {
  return Array.from(await AsyncStorage.getAllKeys());
}

async function multiGet(
  keys: readonly string[],
): Promise<readonly [string, string | null][]> {
  const result: [string, string | null][] = [];

  for (const key of keys) {
    result.push([key, await getItem(key)]);
  }

  return result;
}

async function multiSet(
  pairs: readonly [string, string][],
): Promise<void> {
  for (const [key, value] of pairs) {
    await setItem(key, value);
  }
}

async function multiRemove(keys: readonly string[]): Promise<void> {
  await AsyncStorage.multiRemove([...keys]);
}

const SecureStorage = {
  getItem,
  setItem,
  removeItem,
  getAllKeys,
  multiGet,
  multiSet,
  multiRemove,
};

export default SecureStorage;
export {
  getItem,
  setItem,
  removeItem,
  getAllKeys,
  multiGet,
  multiSet,
  multiRemove,
};

