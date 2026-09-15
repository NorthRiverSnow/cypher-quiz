import { attempt, recover, type Result } from "@cypher-quiz/shared";

import { SECTION_LABELS, type SectionId } from "../types";

import type { Box } from "./leitner";
import type { QuestionKey } from "./quiz.common";
import type { Answer, Boxes, Saved } from "./quiz";

/** model で localStorage を触るのはこのファイルだけ（docs/02_architecture.md#5-ディレクトリ） */
export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const KEY = "cypher-quiz:progress";

/* why: 進捗と別のキーにする。章の選択は成績ではないので、
   「もう一度」で進捗を消しても選び直さずに済む（docs/01_spec.md#7-画面と導線） */
const SECTIONS_KEY = "cypher-quiz:sections";

const EMPTY: Saved = { boxes: {}, answers: [] };

const isBox = (value: unknown): value is Box => value === 0 || value === 1 || value === 2;

const isKey = (value: unknown): value is QuestionKey =>
  typeof value === "string" && (value.endsWith(":forward") || value.endsWith(":reverse"));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/* 以下の read* は、`JSON.parse` が返しただけの**形が保証されていない値**を受け、
 * 読めた分だけを返す。読めなければ空——利用者に判断することが無いので throw しない
 * （docs/01_spec.md#8-失敗の伝え方） */

/** box にならない値を捨てる。レコードでなければ空 */
const readBoxes = (stored: unknown): Boxes =>
  isRecord(stored)
    ? Object.fromEntries(
        Object.entries(stored).filter((entry): entry is [string, Box] => isBox(entry[1])),
      )
    : {};

/** 1 件の回答。1 つでも欠ければ捨てる（`flatMap` で消えるよう配列で返す） */
const readAnswer = (stored: unknown): Answer[] =>
  isRecord(stored) &&
  isKey(stored.key) &&
  typeof stored.correct === "boolean" &&
  typeof stored.chosen === "string"
    ? [{ key: stored.key, correct: stored.correct, chosen: stored.chosen }]
    : [];

const readAnswers = (stored: unknown): readonly Answer[] =>
  Array.isArray(stored) ? stored.flatMap(readAnswer) : [];

const readSaved = (stored: unknown): Saved =>
  isRecord(stored)
    ? { boxes: readBoxes(stored.boxes), answers: readAnswers(stored.answers) }
    : EMPTY;

/**
 * 保存された進捗と成績を読む。壊れていれば空を返す。
 *
 * why: 進捗が無くてもクイズは解ける。知らせる必要が無いので、通知ではなく回復で済ませる
 */
export const load = (store: Store): Saved => {
  const raw = store.getItem(KEY);

  return raw === null ? EMPTY : recover(() => readSaved(JSON.parse(raw)), EMPTY);
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

const isSection = (value: unknown): value is SectionId =>
  typeof value === "string" && value in SECTION_LABELS;

/** 章にならない値を捨て、重複を潰す。配列でなければ空 */
const uniqueSections = (stored: unknown): readonly SectionId[] =>
  Array.isArray(stored) ? [...new Set(stored.filter(isSection))] : [];

/**
 * 前に選んだ章。**初めて開いたときと、壊れていたときは空**。
 *
 * why: 空は「何も選んでいない」で、そのまま仕様どおりの初期状態になる。
 * 全章を既定にすると、選ばずに押した人が 60 問を始めてしまう
 */
export const loadSections = (store: Store): readonly SectionId[] => {
  const raw = store.getItem(SECTIONS_KEY);

  return raw === null ? [] : recover(() => uniqueSections(JSON.parse(raw)), []);
};

export const saveSections = (
  store: Store,
  sections: readonly SectionId[],
): Result<void, "store-unavailable"> =>
  attempt(
    () => store.setItem(SECTIONS_KEY, JSON.stringify(sections)),
    () => "store-unavailable" as const,
  );
