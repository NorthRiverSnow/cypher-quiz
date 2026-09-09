import type { ApiError } from "@cypher-quiz/shared";

import { redact } from "../redact";

const codeOf = (cause: unknown): string =>
  typeof cause === "object" && cause !== null && "code" in cause ? String(cause.code) : "";

/** ドライバの文をそのまま返す。資格情報は取り除いてある */
export const detailOf = (cause: unknown): string =>
  redact(cause instanceof Error ? cause.message : String(cause));

/* why: 想定外のときは中身をクライアントに返さない。ログにだけ残す
   （docs/03_api.md#7-失敗の返し方） */
const UNEXPECTED = "想定外のエラーが起きました";

/**
 * ドライバの例外を、クライアントに返せる形に変える。
 *
 * why: コードで分ける。文言はバージョンで変わるうえ、日本語環境で変わる余地もある。
 * 対応表は docs/03_api.md#ドライバのエラーの対応
 */
export const toApiError = (cause: unknown): ApiError => {
  const code = codeOf(cause);
  const message = detailOf(cause);

  if (code.startsWith("Neo.ClientError.Transaction.TransactionTimedOut")) {
    return { kind: "timeout", message };
  }

  if (code === "Neo.ClientError.Statement.AccessMode") {
    return { kind: "read-only-violation", message };
  }

  if (code.startsWith("Neo.ClientError.Statement.")) {
    return { kind: "syntax-error", message };
  }

  if (code === "Neo.ClientError.Database.DatabaseNotFound") {
    return { kind: "invalid-request", message };
  }

  if (
    code.startsWith("Neo.ClientError.Security.") ||
    code === "ServiceUnavailable" ||
    code === "SessionExpired"
  ) {
    return { kind: "connect-failed", message };
  }

  return { kind: "unexpected", message: UNEXPECTED };
};
