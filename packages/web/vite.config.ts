import { defineConfig, lazyPlugins } from "vite-plus";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: lazyPlugins(() => [react()]),
  /* why: 置き先は https://<user>.github.io/cypher-quiz/ で、アセットがその下に入る。
     build のときだけ効かせる——dev で付けると localhost の URL まで深くなる */
  base: process.env.NODE_ENV === "production" ? "/cypher-quiz/" : "/",
  /* why: /api を api（8787）へ送る。同一オリジンになるので、httpOnly のクッキーが
     そのまま往復する（docs/03_api.md#セッション識別子はフロントに渡さない） */
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8787" },
  },
  test: {
    /* why: happy-dom はレイアウトも描画もしない。検証できるのは DOM の構造と
       イベントの結線まで。:hover や配色の確認は Skill の storybook-shot で撮る */
    environment: "happy-dom",
  },
});
