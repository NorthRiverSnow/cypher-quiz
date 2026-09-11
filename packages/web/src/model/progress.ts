import { attempt, recover, type Result } from "@cypher-quiz/shared";

import type { Box } from "./leitner";
import type { Answer, Boxes, QuestionKey } from "./quiz";

/** localStorage を触るのはこのファイルだけ（docs/02_architecture.md#5-ディレクトリ） */
export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/**
 * 端末に残すもの。
 *
 * why: 成績も残す。結果画面でリロードしても、正解率と不正解一覧が消えない
 * （docs/01_spec.md#7-画面と導線）
 */
export type Saved = Readonly<{ boxes: Boxes; answers: readonly Answer[] }>;

const KEY = "cypher-quiz:progress";

const EMPTY: Saved = { boxes: {}, answers: [] };

const isBox = (value: unknown): value is Box => value === 0 || value === 1 || value === 2;

const isKey = (value: unknown): value is QuestionKey =>
  typeof value === "string" && (value.endsWith(":forward") || value.endsWith(":reverse"));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** box にならない値を捨てる。配列や数値なら空 */
const toBoxes = (parsed: unknown): Boxes =>
  isRecord(parsed)
    ? Object.fromEntries(
        Object.entries(parsed).filter((entry): entry is [string, Box] => isBox(entry[1])),
      )
    : {};

const toAnswer = (parsed: unknown): Answer[] =>
  isRecord(parsed) &&
  isKey(parsed.key) &&
  typeof parsed.correct === "boolean" &&
  typeof parsed.chosen === "string"
    ? [{ key: parsed.key, correct: parsed.correct, chosen: parsed.chosen }]
    : [];

const toAnswers = (parsed: unknown): readonly Answer[] =>
  Array.isArray(parsed) ? parsed.flatMap(toAnswer) : [];

const toSaved = (parsed: unknown): Saved =>
  isRecord(parsed) ? { boxes: toBoxes(parsed.boxes), answers: toAnswers(parsed.answers) } : EMPTY;

/**
 * 保存された進捗と成績を読む。壊れていれば空を返す。
 *
 * why: 進捗が無くてもクイズは解ける。知らせる必要が無いので、通知ではなく回復で済ませる
 */
export const load = (store: Store): Saved => {
  const raw = store.getItem(KEY);

  return raw === null ? EMPTY : recover(() => toSaved(JSON.parse(raw)), EMPTY);
};

/**
 * 進捗と成績を保存する。
 *
 * why: 失敗を Result で返す。Safari のプライベートモードは setItem で例外を throw するが、
 * 進捗が残らないだけでクイズは続けられる
 */
export const save = (store: Store, saved: Saved): Result<void, "store-unavailable"> =>
  attempt(
    () => store.setItem(KEY, JSON.stringify(saved)),
    () => "store-unavailable" as const,
  );

/** 最初から解き直すときに消す */
export const clear = (store: Store): void => {
  store.removeItem(KEY);
};
