import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "react-native",
        replacement: path.resolve(root, "test-shims/react-native.ts"),
      },
      {
        find: "@/lib/secure-storage",
        replacement: path.resolve(root, "test-shims/secure-storage.ts"),
      },
      {
        find: /^@\//,
        replacement: `${root}/`,
      },
    ],
  },
  test: {
    exclude: [
      "node_modules/**",
      ".expo/**",
      "**/backup-*/**",
      "**/backup-*/**/*.test.*",
    ],
  },
});
