import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    // docs/ は guide からの逐語引用を載せる参照資料。整形させると
    //   - `:root { /* light */ }` の1行スキーマが複数行に展開され、図解の意図が消える
    //   - `rgba(15,26,36,.06)` が `rgba(15, 26, 36, 0.06)` に書き換わり「実測値」でなくなる
    // ため対象外にする。表の桁揃えは魅力的だが、代償が大きい。
    ignorePatterns: ["docs/**"],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
