import { defineConfig } from "vite";
import { resolve } from "node:path";

const repoBase = "/font-editor-app/";
const isGithubActions = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  base: isGithubActions ? repoBase : "/",
  build: {
    rollupOptions: {
      input: {
        landing: resolve(__dirname, "index.html"),
        app: resolve(__dirname, "app.html"),
      },
    },
  },
});
