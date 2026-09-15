/**
 * ビルドで決まる値。**層に属さない**——api も controller も screens も引く
 * （`screens/**` は `api/**` を引けない。`vite.config.ts` の lint）。
 */

/**
 * api が居るか。**配布版（GitHub Pages）では居ない**（docs/04_roadmap.md#フェーズ-f--配る）。
 *
 * why: 居ないと分かっているなら問い合わせに行かせない。行かせると、開いた直後に
 * 「接続できません」の通知が出て、壊れているように見える
 */
export const HAS_API = import.meta.env.VITE_HAS_API !== "false";
