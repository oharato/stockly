import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "stockly-api",
    compatibilityDate: "2024-09-23",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "src/index.ts",
    env: {
      DB: bindings.d1({
        name: "stockly-db",
        id: "local-stockly-db",
      }),
      AI: bindings.ai({}),
    },
  },
});
