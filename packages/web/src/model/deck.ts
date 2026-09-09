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
  /** 単体で実行できる。書き込み系と構文列挙だけのカードは false */
  runnable: boolean;
  /** 書き込みクエリを含む。実行ボタンを出さない */
  mutates: boolean;
}>;
