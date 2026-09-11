import type { ApiError, ErrorKind } from "@cypher-quiz/shared";
import { err } from "@cypher-quiz/shared";
import { useCallback } from "react";
import useSWRMutation from "swr/mutation";

import { type ApiClient, createApiClient } from "../api/client";
import { type ResultTableData, toResultTable } from "../model/result";
import type { QueryStatus } from "../types";
import { apiErrorOf, unwrap } from "./swr";
import type { NoticeBody, Notices } from "./useNotices";

export const RUN_KEY = "/api/run";

const BROKEN: ApiError = { kind: "unexpected", message: "クエリを実行できません" };

/* why: kind で分ける。message は利用者向けの文で、機械が読む値ではない
   （docs/03_api.md#7-失敗の返し方）

   送ったクエリが原因の失敗だけカードの中に出す。残りは接続か DB の障害で、
   繋ぎ直しや読み込み直しが要るので帯に出す（docs/01_spec.md#8-失敗の伝え方） */
const IN_CARD: Partial<Record<ErrorKind, QueryStatus>> = {
  "read-only-violation": "rejected",
  "syntax-error": "error",
  "invalid-request": "error",
  timeout: "error",
};

const describe = ({ message }: ApiError): NoticeBody => ({
  tone: "alarm",
  title: "クエリを実行できません",
  detail: message,
});

export type Run = Readonly<{
  status: QueryStatus;
  /** status が "error" のときだけ入る。DB からの文言をそのまま出す */
  errorMessage?: string;
  /** 結果表に渡せる形。行が 0 でも列名は残る */
  result: ResultTableData | undefined;
  run: (cypher: string) => Promise<void>;
  /** 次のカードへ進むときに消す */
  reset: () => void;
}>;

/* why: hook の呼び出しごとに作ると、useCallback の依存が毎回変わって作り直される */
const shared = createApiClient();

/**
 * 教材のクエリを実行する。**クエリが原因の失敗はカードの中、それ以外は帯に出る。**
 *
 * @param connected 繋がっていなければ実行前から offline を出す
 * @param client 差し替えるのはテストだけ
 */
export const useRun = (notices: Notices, connected: boolean, client: ApiClient = shared): Run => {
  const { dismiss, report } = notices;

  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    RUN_KEY,
    (_key: string, { arg }: { arg: string }) => unwrap(client.run({ cypher: arg })),
    {
      /* why: trigger は既定で reject する。呼ぶ側に try を書かせない（実測） */
      throwOnError: false,
      onSuccess: () => dismiss("run"),
      onError: (cause: unknown) => {
        const failed = apiErrorOf(cause, BROKEN);

        /* why: カードに出すものは帯に出さない。前の帯は用済みなので取り下げる */
        if (IN_CARD[failed.kind] === undefined) {
          report("run", err(failed), describe);
        } else {
          dismiss("run");
        }
      },
    },
  );

  const run = useCallback(
    async (cypher: string) => {
      await trigger(cypher);
    },
    [trigger],
  );

  const failed = error === undefined ? undefined : apiErrorOf(error, BROKEN);

  const status: QueryStatus = !connected
    ? "offline"
    : isMutating
      ? "running"
      : failed === undefined
        ? "idle"
        : (IN_CARD[failed.kind] ?? "idle");

  return {
    status,
    ...(status === "error" && failed !== undefined ? { errorMessage: failed.message } : {}),
    result: data === undefined ? undefined : toResultTable(data),
    run,
    reset,
  };
};
