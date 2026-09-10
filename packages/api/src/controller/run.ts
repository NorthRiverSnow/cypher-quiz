import {
  type ApiError,
  type QueryResult,
  type Result,
  type RunRequest,
  err,
  map,
} from "@cypher-quiz/shared";

import type { Logger } from "../log";
import type { DriverStore } from "../neo4j/driverStore";
import { toPlainJson } from "../neo4j/toPlainJson";
import { runReadOnly } from "../neo4j/tx";

export type RunController = Readonly<{
  run: (id: string | undefined, request: RunRequest) => Promise<Result<QueryResult, ApiError>>;
}>;

export type RunDeps = Readonly<{
  store: DriverStore;
  log: Logger;
  /** 1 クエリの上限。超えると timeout を返す */
  timeoutMs: number;
}>;

/* why: クッキーが無いのと失効しているのを分けない。どちらも「繋ぎ直してください」で、
   分けると「あなたのセッションは失効しています」と当てられる口ができる */
const NOT_CONNECTED: ApiError = {
  kind: "not-connected",
  message: "接続していません。接続画面からやり直してください",
};

/**
 * 繋がっている接続で、読み取り専用にクエリを実行する。**HTTP もクッキーも知らない。**
 *
 * why: 読み取り専用の強制・タイムアウト・ログは `runReadOnly` が持つ。ここがするのは
 * 「どの接続で走らせるか」の解決と、素の JSON への変換だけ
 */
export const createRunController = ({ store, log, timeoutMs }: RunDeps): RunController => ({
  run: async (id, { cypher }) => {
    const session = await store.get(id);

    if (session === undefined) {
      return err(NOT_CONNECTED);
    }

    const ran = await runReadOnly(
      { log, timeoutMs },
      {
        driver: session.driver,
        cypher,
        ...(session.database === undefined ? {} : { database: session.database }),
      },
    );

    return map(ran, ({ keys, result }) => toPlainJson(keys, result));
  },
});
