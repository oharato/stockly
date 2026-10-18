import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**"],
    projects: [
      {
        extends: true,
        test: {
          name: "api",
          exclude: ["**/node_modules/**", "**/dist/**", "tests/e2e/**", "apps/web/test/**"],
        },
      },
      {
        extends: "./apps/web/vite.config.ts",
        root: "./apps/web",
        test: {
          name: "web",
          include: ["test/**/*.test.ts"],
        },
      },
    ],
  },
  staged: {
    "*": "vp check --fix",
  },
});
