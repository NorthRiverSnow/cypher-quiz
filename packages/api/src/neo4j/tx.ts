import { type ApiError, type Result, attemptAsync, err, isOk, ok } from "@cypher-quiz/shared";
import neo4j, { type Driver, type ManagedTransaction, type QueryResult } from "neo4j-driver";

import type { Logger } from "../log";
import { acceptReadOnly } from "./readOnly";
import { detailOf, toApiError } from "./toApiError";

export type TxDeps = Readonly<{
  log: Logger;
  /** トランザクションの上限。超えると timeout を返す */
  timeoutMs: number;
}>;

export type TxRequest = Readonly<{
  driver: Driver;
  database?: string;
  reqId: string;
  cypher: string;
}>;

export type QueryOutput = Readonly<{
  /** 列名。RETURN に書かれた順。0 行でも消えない */
  keys: readonly string[];
  result: QueryResult;
}>;

/* why: 列名は await した結果に含まれない。0 行のとき列見出しが消えるので、
   Result を await する前に keys() から取る（docs/03_api.md#列名は結果から取れない） */
const runQuery = async (tx: ManagedTransaction, cypher: string): Promise<QueryOutput> => {
  const running = tx.run(cypher);

  return { keys: await running.keys(), result: await running };
};

/* why: 閉じられなくても結果は返す。知らせる先が無いので warn に留める */
const close = async (log: Logger, reqId: string, session: { close: () => Promise<void> }) => {
  const closed = await attemptAsync(() => session.close(), detailOf);

  if (!closed.ok) {
    log({ event: "error", reqId, name: "SessionCloseFailed", message: closed.error }, "warn");
  }
};

/**
 * 読み取り専用の 1 トランザクションでクエリを実行する。
 *
 * **`driver.session()` を呼ぶのはここだけ。** 読み取りモード・タイムアウト・
 * `query.run` のログ・失敗の変換が、これを通る全てのクエリに掛かる
 * （docs/03_api.md#9-トランザクション）。
 *
 * why: EXPLAIN と本体を同じトランザクションで走らせる。分けると、判定した後に
 * 別のスナップショットで実行することになる
 */
export const runReadOnly = async (
  { log, timeoutMs }: TxDeps,
  { driver, database, reqId, cypher }: TxRequest,
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

          log({ event: "query.run", reqId, cypher, readOnly: isOk(allowed) });

          return isOk(allowed) ? ok(await runQuery(tx, cypher)) : err(allowed.error);
        },
        { timeout: timeoutMs },
      ),
    /* why: 変換後の ApiError と、ドライバの元の文の両方を持つ。想定外のときだけ
       元の文をログに残す——クライアントには返さないので、ここで捨てると追えなくなる */
    (cause) => ({ api: toApiError(cause), detail: detailOf(cause) }),
  );

  await close(log, reqId, session);

  if (ran.ok) {
    return ran.value;
  }

  if (ran.error.api.kind === "unexpected") {
    log({ event: "error", reqId, name: "DriverError", message: ran.error.detail });
  }

  return err(ran.error.api);
};
