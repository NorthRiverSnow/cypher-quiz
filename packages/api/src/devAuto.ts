import { type Result, attempt, err, isOk, map, mapErr, ok } from "@cypher-quiz/shared";

import { isLocal, secureUri } from "./neo4j/uri";

/** `uri` は[繋ぎ変えたあと](./neo4j/uri.ts)のもの。そのまま起動バナーに出せる */
export type DevAuto = Readonly<{ uri: string; user: string; password: string }>;

type Env = Readonly<Record<string, string | undefined>>;

const ENABLED = "true";

/* why: database を読む口を作っていない。自動接続の相手は dev の Neo4j 1 つで、
   Community Edition はユーザ DB を 1 つしか持てない */
const REQUIRED = ["NEO4J_URI", "NEO4J_USER", "NEO4J_PASSWORD"] as const;

const IN_PRODUCTION = "NODE_ENV=production では DEV_AUTO_CONNECT を有効にできません";

const REMOTE =
  "DEV_AUTO_CONNECT が繋げるのはローカルだけです。" +
  "他へ繋ぐなら DEV_AUTO_CONNECT_ALLOW_REMOTE=true を明示してください";

/* why: 文に URI を入れない。資格情報が埋まっていることがある */
const MALFORMED = "NEO4J_URI の形が正しくありません";

const missing = (names: readonly string[]): string =>
  `DEV_AUTO_CONNECT が有効ですが ${names.join(" / ")} がありません`;

const hostOf = (uri: string): Result<string, string> =>
  attempt(
    () => new URL(uri).hostname,
    () => MALFORMED,
  );

/**
 * `.env` から自動接続の設定を読む。**有効になっていなければ `undefined`**。
 *
 * why: 設定の食い違いは err で返し、[server.ts](./server.ts) が起動を止める。
 * 黙って無効化すると、繋がらない理由が画面にもログにも出ない
 * （docs/03_api.md#歯止め）
 */
export const readDevAuto = (env: Env): Result<DevAuto | undefined, string> => {
  if (env.DEV_AUTO_CONNECT !== ENABLED) {
    return ok(undefined);
  }

  if (env.NODE_ENV === "production") {
    return err(IN_PRODUCTION);
  }

  const absent = REQUIRED.filter((name) => (env[name] ?? "") === "");

  if (absent.length > 0) {
    return err(missing(absent));
  }

  const uri = env.NEO4J_URI ?? "";
  const host = hostOf(uri);

  if (!isOk(host)) {
    return host;
  }

  if (!isLocal(host.value) && env.DEV_AUTO_CONNECT_ALLOW_REMOTE !== ENABLED) {
    return err(REMOTE);
  }

  return map(
    mapErr(secureUri(uri), ({ message }) => message),
    (target) => ({ uri: target, user: env.NEO4J_USER ?? "", password: env.NEO4J_PASSWORD ?? "" }),
  );
};
