import { type ApiError, type Result, attempt, err, ok } from "@cypher-quiz/shared";

/* why: 平文のスキームと、その暗号化版の対応。+s は公的な証明書、+ssc は自己署名も通す */
const ENCRYPTED_OF: Readonly<Record<string, string>> = { "bolt:": "bolt+s:", "neo4j:": "neo4j+s:" };

const ENCRYPTED: readonly string[] = ["bolt+s:", "bolt+ssc:", "neo4j+s:", "neo4j+ssc:"];

/* why: compose のサービス名も入れる。コンテナの中からはこの名前で引く */
const LOCAL: readonly string[] = ["localhost", "127.0.0.1", "[::1]", "neo4j", "neo4j-test"];

const INVALID_SCHEME: ApiError = {
  kind: "invalid-request",
  message: "接続先は bolt / neo4j / bolt+s / neo4j+s / bolt+ssc / neo4j+ssc で指定します",
};

/* why: 文に URI を入れない。資格情報が埋まっていることがあるので、指摘だけ返す */
const CREDENTIALS_IN_URI: ApiError = {
  kind: "invalid-request",
  message: "接続先に利用者名とパスワードを含めないでください",
};

/** 同じ機械の中。dev の自動接続もこの判定を使う（docs/03_api.md#歯止め） */
export const isLocal = (host: string): boolean => LOCAL.includes(host.toLowerCase());

/**
 * 実際に繋ぐ URI を決める。**ローカル以外は暗号化スキームに繋ぎ変える。**
 *
 * why: 平文のまま外へ出すとパスワードがネットワークに流れる。拒否せず繋ぎ変えるのは、
 * 暗号化に対応した相手（Aura など）ならそのまま繋がるため。対応していなければ
 * ドライバが失敗するので、**どちらにしても平文では出ない**
 */
export const secureUri = (uri: string): Result<string, ApiError> => {
  const parsed = attempt(
    () => new URL(uri),
    () => INVALID_SCHEME,
  );

  if (!parsed.ok) {
    return parsed;
  }

  const { protocol, hostname, username, password } = parsed.value;

  if (username !== "" || password !== "") {
    return err(CREDENTIALS_IN_URI);
  }

  if (ENCRYPTED.includes(protocol)) {
    return ok(uri);
  }

  const encrypted = ENCRYPTED_OF[protocol];

  if (encrypted === undefined) {
    return err(INVALID_SCHEME);
  }

  return ok(isLocal(hostname) ? uri : `${encrypted}${uri.slice(protocol.length)}`);
};
