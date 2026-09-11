import { type ApiError, ApiErrorSchema, type Result, isOk } from "@cypher-quiz/shared";

/**
 * `Result` を SWR の成功／失敗に振り分ける。**`err` は throw する。**
 *
 * why: SWR は fetcher が reject したかどうかで失敗を決める。err を成功として返すと
 * onError も error も一生使われない（docs/02_architecture.md#web-の取得は-swr-に載せる）
 *
 * why: async にする。同期 throw では SWR の状態が確定せず、isLoading が true のまま残る（実測）
 */
export const unwrap = async <T>(call: Promise<Result<T, ApiError>>): Promise<T> => {
  const result = await call;

  if (!isOk(result)) {
    throw result.error;
  }

  return result.value;
};

/**
 * SWR が捕まえたものを `ApiError` に戻す。
 *
 * @param fallback `ApiError` でなかったとき——client のバグは message を持たない
 */
export const apiErrorOf = (cause: unknown, fallback: ApiError): ApiError => {
  const parsed = ApiErrorSchema.safeParse(cause);

  return parsed.success ? parsed.data : fallback;
};
