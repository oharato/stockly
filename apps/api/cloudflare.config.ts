import { bindings, defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "stockly",
    compatibilityDate: "2024-09-23",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "src/index.ts",
    assets: {
      notFoundHandling: "single-page-application",
      runWorkerFirst: ["/api/*"],
    },
    env: {
      DB: bindings.d1({
        name: "stockly-db-prod",
        id: "5ad75ef2-f2a1-419e-bc68-90ee139455b7",
      }),
      STORAGE: bindings.r2({
        name: "stockly-media-prod",
      }),
      AI: bindings.ai({}),
      ASSETS: bindings.assets(),
    },
  },
});
