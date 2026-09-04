import { defineConfig, lazyPlugins } from "vite-plus";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: lazyPlugins(() => [react()]),
  server: { port: 5173 },
  test: {
    /* why: happy-dom はレイアウトも描画もしない。検証できるのは DOM の構造と
       イベントの結線まで。:hover や配色の確認は Skill の storybook-shot で撮る */
    environment: "happy-dom",
  },
});
