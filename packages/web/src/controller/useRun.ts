import type { ApiError, QueryResult } from "@cypher-quiz/shared";
import { useCallback } from "react";
import useSWRMutation from "swr/mutation";

import { type ApiClient, createApiClient } from "../api/client";
import type { QueryStatus } from "../types";
import { apiErrorOf, unwrap } from "./swr";

export const RUN_KEY = "/api/run";

const BROKEN: ApiError = { kind: "unexpected", message: "クエリを実行できません" };

/* why: kind で分ける。message は利用者向けの文で、機械が読む値ではない
   （docs/03_api.md#7-失敗の返し方） */
const STATUS: Partial<Record<ApiError["kind"], QueryStatus>> = {
  "not-connected": "offline",
  "read-only-violation": "rejected",
};

export type Run = Readonly<{
  status: QueryStatus;
  /** status が "error" のときだけ入る。DB からの文言をそのまま出す */
  errorMessage?: string;
  result: QueryResult | undefined;
  run: (cypher: string) => Promise<void>;
  /** 次のカードへ進むときに消す */
  reset: () => void;
}>;

/* why: hook の呼び出しごとに作ると、useCallback の依存が毎回変わって作り直される */
const shared = createApiClient();

/**
 * 教材のクエリを実行する。**失敗は編集欄の中に出る。**
 *
 * why: 通知に積まない。実行したその場に出したほうが、どのクエリの話か分かる
 * （docs/01_spec.md#8-失敗の伝え方）
 *
 * @param connected 繋がっていなければ実行前から offline を出す
 * @param client 差し替えるのはテストだけ
 */
export const useRun = (connected: boolean, client: ApiClient = shared): Run => {
  const { trigger, data, error, isMutating, reset } = useSWRMutation(
    RUN_KEY,
    (_key: string, { arg }: { arg: string }) => unwrap(client.run({ cypher: arg })),
    /* why: trigger は既定で reject する。呼ぶ側に try を書かせない（実測） */
    { throwOnError: false },
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
        : (STATUS[failed.kind] ?? "error");

  return {
    status,
    ...(status === "error" && failed !== undefined ? { errorMessage: failed.message } : {}),
    result: data,
    run,
    reset,
  };
};
