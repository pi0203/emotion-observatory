import { defineConfig } from "vitest/config";

/**
 * Node 25+ turns on an experimental `localStorage` global that stays
 * `undefined` without `--localstorage-file`. The jsdom environment keeps a
 * global that already exists, so `window.localStorage` would be undefined in
 * every test. Turning the Node feature off in the worker processes lets jsdom
 * supply its own Storage, as it does on older Node versions. The flag is only
 * passed where Node knows it, so older versions are unaffected.
 */
const webStorageOff = process.allowedNodeEnvironmentFlags.has("--experimental-webstorage") ? ["--no-experimental-webstorage"] : [];

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    poolOptions: {
      forks: { execArgv: webStorageOff },
      threads: { execArgv: webStorageOff },
    },
  },
});
