/* スタイルの入口。アプリ（main.tsx）と Storybook（.storybook/preview.tsx）が
 * どちらもここを読む。CSS の import をこの 1 箇所に集めておく理由は 2 つ。
 *
 *   - 読み込む順番と対象が 1 箇所で決まる
 *   - `*.css` の副作用 import は src/css.d.ts の宣言が要る（TS2882）。src の外から
 *     直接 CSS を import すると、その宣言が届かない環境がある
 */
import "./tokens.css";
