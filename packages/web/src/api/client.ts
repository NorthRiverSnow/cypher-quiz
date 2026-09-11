import {
  type ApiError,
  ApiErrorSchema,
  type ConnectRequest,
  type ConnectionStatus,
  ConnectionStatusSchema,
  type QueryResult,
  QueryResultSchema,
  type Result,
  type RunRequest,
  attemptAsync,
  err,
  flatMap,
  ok,
} from "@cypher-quiz/shared";

export type Fetching = (path: string, init?: RequestInit) => Promise<Response>;

export type ApiClient = Readonly<{
  status: () => Promise<Result<ConnectionStatus, ApiError>>;
  connect: (request: ConnectRequest) => Promise<Result<ConnectionStatus, ApiError>>;
  disconnect: () => Promise<Result<ConnectionStatus, ApiError>>;
  run: (request: RunRequest) => Promise<Result<QueryResult, ApiError>>;
}>;

/* why: safeParse だけを使う。zod を web の依存に足さずに、スキーマから型を取れる */
type Schema<T> = Readonly<{
  safeParse: (input: unknown) => Readonly<{ success: true; data: T } | { success: false }>;
}>;

const CONNECT = "/api/connect";
const RUN = "/api/run";

/* why: ApiError は api が返す形だが、api へ届かなかったときの形でもある。
   1 つに揃えないと、呼ぶ側が 2 種類の失敗を書き分けることになる
   （docs/03_api.md#7-失敗の返し方） */
const UNREACHABLE: ApiError = { kind: "connect-failed", message: "api に繋がりません" };
const MALFORMED: ApiError = { kind: "unexpected", message: "api の応答を読めません" };

/* why: fetch の既定の credentials は same-origin。クッキーは /api への同一オリジンの
   要求に載るので、明示しない（proxy 経由でもオリジンは変わらない） */
const browserFetch: Fetching = (path, init) => globalThis.fetch(path, init);

const asJson = (body: unknown, init?: RequestInit): RequestInit => ({
  ...init,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

const parse = <T>(schema: Schema<T>, body: unknown): Result<T, ApiError> => {
  const parsed = schema.safeParse(body);

  return parsed.success ? ok(parsed.data) : err(MALFORMED);
};

/**
 * 1 往復。**2xx なら本文をそのまま、それ以外は `ApiError` として返す。**
 *
 * why: 応答の形は呼ぶ側が知っている。ここでは unknown のまま返し、
 * 各メソッドが自分のスキーマで受ける
 */
const send = async (
  fetching: Fetching,
  path: string,
  init?: RequestInit,
): Promise<Result<unknown, ApiError>> => {
  const sent = await attemptAsync(
    () => fetching(path, init),
    () => UNREACHABLE,
  );

  if (!sent.ok) {
    return sent;
  }

  const body = await attemptAsync(
    (): Promise<unknown> => sent.value.json(),
    () => MALFORMED,
  );

  if (!body.ok || sent.value.ok) {
    return body;
  }

  const failed = ApiErrorSchema.safeParse(body.value);

  return err(failed.success ? failed.data : MALFORMED);
};

/** api を叩く唯一の場所。**`fetch` を書いてよいのはここだけ** */
export const createApiClient = (fetching: Fetching = browserFetch): ApiClient => {
  const statusFrom = async (path: string, init?: RequestInit) =>
    flatMap(await send(fetching, path, init), (body) => parse(ConnectionStatusSchema, body));

  return {
    status: () => statusFrom(CONNECT),
    connect: (request) => statusFrom(CONNECT, asJson(request, { method: "POST" })),
    disconnect: () => statusFrom(CONNECT, { method: "DELETE" }),
    run: async (request) =>
      flatMap(await send(fetching, RUN, asJson(request, { method: "POST" })), (body) =>
        parse(QueryResultSchema, body),
      ),
  };
};
