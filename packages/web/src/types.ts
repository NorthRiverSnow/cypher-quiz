/* Model・Controller と View が共有する型（docs/02_architecture.md「型は共有、ロジックは非共有」）。
 * lint が View から model/** と controller/** を禁止しているので、両方が要る型はここに置く。
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

/** 章ごとの成績（docs/01_spec.md#7-画面と導線） */
export type SectionScore = Readonly<{ section: SectionId; asked: number; correct: number }>;

/** 一度でも間違えた問題。行を押すとその裏を開く */
export type MissedCard = Readonly<{
  /* why: 押されたときに URL を組む。名前を使うと、文言を直した瞬間にリンクが壊れる */
  id: string;
  section: SectionId;
  name: string;
  direction: Direction;
}>;

/* 色は docs/07_design.md#エンティティ色。結果表の字にしか出ない */
export type EntityKind = "team" | "engineer" | "service" | "incident";

/** ノードとして返った値だけ色を持つ。それ以外は素の字 */
export type ResultCell = string | Readonly<{ kind: EntityKind; text: string }>;

/** クエリ実行の見え方。offline は未接続、rejected は読み取り専用で拒否された */
export type QueryStatus = "idle" | "running" | "offline" | "rejected" | "error";

/* 正順・逆順の意味は docs/01_spec.md#2-出題形式 */
export type Direction = "forward" | "reverse";

export const DIRECTION_LABELS: Record<Direction, string> = {
  forward: "構文 → 目的",
  reverse: "目的 → 構文",
};

/** 失敗の重さ。alarm は操作が失敗した、warn は続けられるが不都合がある */
export type NoticeTone = "alarm" | "warn";

/** 失敗の出どころ。種類ごとに 1 件だけ持つ */
export type NoticeKind = "progress-save" | "connect" | "run" | "unexpected";

export type NoticeItem = Readonly<{
  kind: NoticeKind;
  tone: NoticeTone;
  title: string;
  /** サーバやブラウザからの文言 */
  detail?: string;
}>;
