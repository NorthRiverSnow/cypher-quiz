import type { CodeSegment, SectionId } from "../types";

export type Card = Readonly<{
  id: string;
  section: SectionId;
  name: string;
  role: string;
  code?: readonly CodeSegment[];
  expected?: string;
  note?: string;
  warn?: string;
  /** 書き込みを含む。**編集欄そのものを出さない**（docs/01_spec.md#4-クエリの実行と編集） */
  mutates: boolean;
  /** 構文を並べたもので、1 本のクエリになっていない。編集欄が書き換えを促す */
  listing?: true;
}>;

/**
 * 編集欄に出す本文。ハイライトの区切りを繋いで 1 本の文字列にする。
 *
 * why: note は落とす。読み手への注釈なので、そのまま送ると構文エラーになる
 */
export const cypherOf = (code: readonly CodeSegment[]): string =>
  code
    .filter(({ kind }) => kind !== "note")
    .map(({ text }) => text)
    .join("");
