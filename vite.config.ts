import { defineConfig } from "vite-plus";

/* why: View の各層に同じ patterns を書き足す。同じファイルに override が 2 つ当たると
   後の設定が前を置き換えるので、アトミックデザインの規則だけを書くと MVC の禁止が消える */
const NO_LOGIC = ["**/model/**", "**/controller/**"];

export default defineConfig({
  fmt: {
    // docs/ は guide からの逐語引用を載せる参照資料。整形させると
    //   - `:root { /* light */ }` の1行スキーマが複数行に展開され、図解の意図が消える
    //   - `rgba(15,26,36,.06)` が `rgba(15, 26, 36, 0.06)` に書き換わり「実測値」でなくなる
    // ため対象外にする。表の桁揃えは魅力的だが、代償が大きい。
    ignorePatterns: ["docs/**"],
  },
  test: {
    /* why: 各パッケージの vite.config.ts を使わせる。root で束ねると
       packages/web の test.environment（happy-dom）が効かず DOM が無いまま走る

       why: packages/api を並べない。api のテストは Neo4j に繋ぐので、DB の無い
       ホストでは失敗する。走らせる口は vp run test:api（テスト用 DB を立てる） */
    projects: ["packages/shared", "packages/web"],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
    overrides: [
      {
        // Model は React も DOM も、上の層も知らない
        files: ["packages/web/src/model/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            { patterns: ["react", "react-dom", "**/view/**", "**/controller/**"] },
          ],
        },
      },
      {
        // View はロジックも副作用も知らない。型は types.ts と @cypher-quiz/shared から取る
        files: ["packages/web/src/view/**"],
        rules: { "no-restricted-imports": ["error", { patterns: NO_LOGIC }] },
      },
      {
        // 結線の層。controller は呼ぶが、model には触らない
        files: ["packages/web/src/routes.tsx", "packages/web/src/main.tsx"],
        rules: { "no-restricted-imports": ["error", { patterns: ["**/model/**"] }] },
      },
      // アトミックデザインの層。下の層しか import できない
      {
        files: ["packages/web/src/view/atoms/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [
                ...NO_LOGIC,
                "**/molecules/**",
                "**/organisms/**",
                "**/templates/**",
                "**/pages/**",
              ],
            },
          ],
        },
      },
      {
        files: ["packages/web/src/view/molecules/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            {
              patterns: [...NO_LOGIC, "**/organisms/**", "**/templates/**", "**/pages/**"],
            },
          ],
        },
      },
      {
        files: ["packages/web/src/view/organisms/**"],
        rules: {
          "no-restricted-imports": [
            "error",
            { patterns: [...NO_LOGIC, "**/templates/**", "**/pages/**"] },
          ],
        },
      },
      {
        files: ["packages/web/src/view/templates/**"],
        rules: {
          "no-restricted-imports": ["error", { patterns: [...NO_LOGIC, "**/pages/**"] }],
        },
      },
    ],
  },
});
