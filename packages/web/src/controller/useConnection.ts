import type { ApiError, ConnectRequest, ConnectionStatus, Result } from "@cypher-quiz/shared";
import { ApiErrorSchema, err, isOk, ok } from "@cypher-quiz/shared";
import { useCallback } from "react";
import useSWR from "swr";

import { type ApiClient, createApiClient } from "../api/client";
import type { NoticeBody, Notices } from "./useNotices";

/** SWR のキー。`mutate` を外から呼ぶときも同じ値を使う */
export const CONNECTION_KEY = "/api/connect";

const DISCONNECTED: ConnectionStatus = { connected: false };

const BROKEN: ApiError = { kind: "unexpected", message: "接続状態を取得できません" };

export type Connection = Readonly<{
  /** 最初の取得が終わるまでは undefined */
  status: ConnectionStatus | undefined;
  loading: boolean;
  /** 繋がったかどうか。失敗の中身は通知に出るので、呼ぶ側は見ない */
  connect: (request: ConnectRequest) => Promise<boolean>;
  disconnect: () => Promise<void>;
}>;

const describe = ({ message }: ApiError): NoticeBody => ({
  tone: "alarm",
  title: "接続できません",
  detail: message,
});

/**
 * `Result` を SWR の成功／失敗に振り分ける。**err は throw する。**
 *
 * why: SWR は fetcher が reject したかどうかで失敗を決める。err を成功として返すと
 * onError も error も一生使われない（docs/02_architecture.md#web-の取得は-swr-に載せる）
 *
 * why: async にする。同期 throw では SWR の状態が確定せず、isLoading が true のまま残る（実測）
 */
const unwrap = async <T>(call: Promise<Result<T, ApiError>>): Promise<T> => {
  const result = await call;

  if (!isOk(result)) {
    throw result.error;
  }

  return result.value;
};

/* why: throw されたものが ApiError とは限らない。client のバグは message を持たない */
const apiErrorOf = (cause: unknown): ApiError => {
  const parsed = ApiErrorSchema.safeParse(cause);

  return parsed.success ? parsed.data : BROKEN;
};

/* why: hook の呼び出しごとに作ると、useCallback の依存が毎回変わって作り直される */
const shared = createApiClient();

/**
 * 接続状態の取得と、繋ぐ・切る。**失敗は通知に積まれる。**
 *
 * @param client 差し替えるのはテストだけ
 */
export const useConnection = (notices: Notices, client: ApiClient = shared): Connection => {
  const { report } = notices;

  const { data, isLoading, mutate } = useSWR(CONNECTION_KEY, () => unwrap(client.status()), {
    onSuccess: () => void report("connect", ok(undefined), describe),
    onError: (cause: unknown) => void report("connect", err(apiErrorOf(cause)), describe),

    /* why: 失敗が error に載るようになったので、既定の無限再試行を切る。
       not-connected も client のバグも、投げ直して直るものではない */
    shouldRetryOnError: false,

    /* why: 取り直さない。dev 自動接続は「クッキーが無ければ繋ぐ」なので、
       タブを戻っただけで切断が取り消され、手入力に戻す道（docs/03_api.md#歯止め の 5）が塞がる */
    revalidateOnFocus: false,
  });

  const connect = useCallback(
    async (request: ConnectRequest) => {
      const result = report("connect", await client.connect(request), describe);

      if (isOk(result)) {
        await mutate(result.value, { revalidate: false });
      }

      return isOk(result);
    },
    [client, mutate, report],
  );

  const disconnect = useCallback(async () => {
    report("connect", await client.disconnect(), describe);

    /* why: 切った後にサーバへ問い合わせない。dev 自動接続がその場で繋ぎ直す */
    await mutate(DISCONNECTED, { revalidate: false });
  }, [client, mutate, report]);

  return { status: data, loading: isLoading, connect, disconnect };
};
