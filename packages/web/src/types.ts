/* Model の型。View は型だけを要る（docs/02_architecture.md「型は共有、ロジックは非共有」）。
 *
 * why: packages/shared ではなくここに置く。shared はフェーズ C で API と共有するために
 * 作るもので、フェーズ A の時点では web しか読まない。
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

/* 出題の向き。正順は構文 → 目的、逆順は目的 → 構文（docs/01_spec.md §2） */
export type Direction = "forward" | "reverse";
