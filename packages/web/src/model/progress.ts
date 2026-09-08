import { attempt, mapErr, type Result, unwrapOr } from "@cypher-quiz/shared";

import type { Box } from "./leitner";
import type { Boxes } from "./quiz";

/** localStorage を触るのはこのファイルだけ（docs/02_architecture.md#5-ディレクトリ） */
export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const KEY = "cypher-quiz:progress";

const isBox = (value: unknown): value is Box => value === 0 || value === 1 || value === 2;

/** box にならない値を捨てる。配列や数値なら空 */
const toBoxes = (parsed: unknown): Boxes => {
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};

  return Object.fromEntries(
    Object.entries(parsed).filter((entry): entry is [string, Box] => isBox(entry[1])),
  );
};

/**
 * 保存された習熟度を読む。壊れていれば空を返す。
 *
 * why: 利用者が手で書き換えられる場所なので、知らない形は捨てて最初から始める
 */
export const loadBoxes = (store: Store): Boxes => {
  const raw = store.getItem(KEY);
  if (raw === null) return {};

  return unwrapOr(
    attempt(() => toBoxes(JSON.parse(raw))),
    {},
  );
};

/**
 * 習熟度を保存する。
 *
 * why: 失敗を Result で返す。Safari のプライベートモードは setItem で例外を throw するが、
 * 進捗が残らないだけでクイズは続けられる
 */
export const saveBoxes = (store: Store, boxes: Boxes): Result<undefined, "store-unavailable"> =>
  mapErr(
    attempt(() => {
      store.setItem(KEY, JSON.stringify(boxes));

      return undefined;
    }),
    (): "store-unavailable" => "store-unavailable",
  );

/** 最初から解き直すときに消す */
export const clearBoxes = (store: Store): void => {
  store.removeItem(KEY);
};
