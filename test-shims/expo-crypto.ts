// Test-only substitute for expo-crypto. Production code still uses the
// real expo-crypto — this alias only applies under Vitest, and only
// exists because importing expo-modules-core (a transitive dependency
// of expo-crypto) references the bare global __DEV__, which is a
// Metro/Expo runtime global that does not exist under Vitest's Node
// environment. Behavior is identical: a random UUIDv4.
import { randomUUID as nodeRandomUUID } from "node:crypto";

export function randomUUID(): string {
  return nodeRandomUUID();
}