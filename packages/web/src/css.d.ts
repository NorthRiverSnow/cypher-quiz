/* CSS Modules は class 名の対応表を返す。:hover / :focus-visible のように
 * インライン style で書けない見た目はこちらで書く。
 *
 * why: `*.css` より先に宣言する。どちらもワイルドカードの接頭辞が空で、
 * 後に書くと `*.css`（中身が空）に食われて class 名が引けなくなる。
 */
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

/* CSS を副作用として import できるようにする型宣言。
 *
 * vite-plus-core の client 型は `*?inline` しか宣言しておらず、素の `*.css` は型が無い。
 * TypeScript 7 は副作用 import に型宣言を要求する（TS2882）ため、ここで補う。
 *
 * 中身が空なのは意図どおり。値を取り出すのではなく、読み込ませてスタイルを
 * 適用させるだけの import に使う。
 */
declare module "*.css" {}
