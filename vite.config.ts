import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    // docs/ は guide からの逐語引用を載せる参照資料。整形させると
    //   - `:root { /* light */ }` の1行スキーマが複数行に展開され、図解の意図が消える
    //   - `rgba(15,26,36,.06)` が `rgba(15, 26, 36, 0.06)` に書き換わり「実測値」でなくなる
    // ため対象外にする。表の桁揃えは魅力的だが、代償が大きい。
    ignorePatterns: ["docs/**"],
  },
  // コミット時に、ステージされたファイルへ fmt / lint / typecheck を掛ける。
  // docs/ は guide からの逐語引用なので対象パターンに含めない（fmt.ignorePatterns と同じ理由）。
  //
  // --fix は付けない。このリポジトリのパスに「ドキュメント」が含まれ、$PWD が NFC・
  // ファイルシステムが NFD という正規化の食い違いがあるため、lint-staged が修正後に
  // 絶対パスで git add し直す段階で "is outside repository" で失敗する。
  // 検査だけなら再ステージが走らないので問題にならない。直すのは `vp check --fix` を手で。
  staged: {
    "*.{ts,tsx,mts,cts,js,jsx,css,json,yaml,yml}": "vp check",
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },
});
