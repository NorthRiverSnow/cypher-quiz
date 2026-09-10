import { type ApiError, type Result, attemptAsync, err, isOk, ok } from "@cypher-quiz/shared";
import neo4j, { type Driver, type ManagedTransaction, type QueryResult } from "neo4j-driver";

import type { Logger } from "../log";
import { closeQuietly } from "./closeQuietly";
import { acceptReadOnly } from "./readOnly";
import { reportDriverError } from "./toApiError";

export type TxDeps = Readonly<{
  log: Logger;
  /** トランザクションの上限。超えると timeout を返す */
  timeoutMs: number;
}>;

export type TxRequest = Readonly<{
  driver: Driver;
  database?: string;
  cypher: string;
}>;

export type QueryOutput = Readonly<{
  /** 列名。RETURN に書かれた順。0 行でも消えない */
  keys: readonly string[];
  result: QueryResult;
}>;

/* why: 列名は await した結果に含まれない。Result を await する前に keys() から取る
   （docs/03_api.md#列名は結果から取れない） */
const runQuery = async (tx: ManagedTransaction, cypher: string): Promise<QueryOutput> => {
  const running = tx.run(cypher);

  return { keys: await running.keys(), result: await running };
};

/**
 * 読み取り専用の 1 トランザクションでクエリを実行する。
 * **`driver.session()` を呼ぶのはここだけ**（docs/03_api.md#9-トランザクション）。
 *
 * why: EXPLAIN と本体を同じトランザクションで走らせる。分けると、判定した後に
 * 別のスナップショットで実行することになる
 */
export const runReadOnly = async (
  { log, timeoutMs }: TxDeps,
  { driver, database, cypher }: TxRequest,
): Promise<Result<QueryOutput, ApiError>> => {
  const session = driver.session({
    defaultAccessMode: neo4j.session.READ,
    ...(database === undefined ? {} : { database }),
  });

  const ran = await attemptAsync(
    () =>
      session.executeRead<Result<QueryOutput, ApiError>>(
        async (tx) => {
          const explained = await tx.run(`EXPLAIN ${cypher}`);
          const allowed = acceptReadOnly(explained.summary.queryType, explained.summary.plan);

          log({ event: "query.run", cypher, readOnly: isOk(allowed) });

          return isOk(allowed) ? ok(await runQuery(tx, cypher)) : err(allowed.error);
        },
        { timeout: timeoutMs },
      ),
    /* why: ここでは変換しない。閉じたあとに reportDriverError へ渡す */
    (cause) => cause,
  );

  await closeQuietly(log, "SessionCloseFailed", session);

  return ran.ok ? ran.value : err(reportDriverError(log, ran.error));
};
