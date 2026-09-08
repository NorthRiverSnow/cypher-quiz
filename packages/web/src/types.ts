/* Model と View が共有する型（docs/02_architecture.md「型は共有、ロジックは非共有」）。
 * lint が View から model/** を禁止しているので、両方が要る型はここに置く。
 *
 * TODO: フェーズ C で packages/shared へ移す。shared は API と型を共有するために作るもので、
 * 今は web しか読まない。
 */

export type SectionId = "skeleton" | "patterns" | "shaping" | "lists" | "writing" | "subqueries";

/* 値は guide 03 の h2 見出しそのまま */
export const SECTION_LABELS: Record<SectionId, string> = {
  skeleton: "読み取りの骨格",
  patterns: "パターンの書き方",
  shaping: "結果の整形",
  lists: "リストと集約",
  writing: "書き込み",
  subqueries: "サブクエリ・スキーマ・診断",
};

/* コードの色分け。意味は docs/07_design.md#7-コードのハイライト */
export type CodeKind = "kw" | "rel" | "hl" | "bad" | "cm";

/** kind が無ければ素の字 */
export type CodeSegment = { text: string; kind?: CodeKind };

/* 正順・逆順の意味は docs/01_spec.md#2-出題形式 */
export type Direction = "forward" | "reverse";

export const DIRECTION_LABELS: Record<Direction, string> = {
  forward: "構文 → 目的",
  reverse: "目的 → 構文",
};
