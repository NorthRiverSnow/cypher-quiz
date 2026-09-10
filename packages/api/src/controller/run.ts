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
  timeoutMs: number;
}>;

/* 分けない理由は docs/03_api.md#7-失敗の返し方 */
const NOT_CONNECTED: ApiError = {
  kind: "not-connected",
  message: "接続していません。接続画面からやり直してください",
};

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
