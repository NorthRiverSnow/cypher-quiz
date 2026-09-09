import { describe, expect, it } from "vite-plus/test";

import { createLogger } from "../log";
import { detailOf, reportDriverError, toApiError } from "./toApiError";

const neo4jError = (code: string, message = "サーバからの文") =>
  Object.assign(new Error(message), { code });

describe("toApiError", () => {
  /* why: 対応表は docs/03_api.md#ドライバのエラーの対応。コードは実測して並べた */
  it.each([
    ["Neo.ClientError.Transaction.TransactionTimedOutClientConfiguration", "timeout"],
    ["Neo.ClientError.Transaction.TransactionTimedOut", "timeout"],
    ["Neo.ClientError.Statement.AccessMode", "read-only-violation"],
    ["Neo.ClientError.Statement.SyntaxError", "syntax-error"],
    ["Neo.ClientError.Statement.SemanticError", "syntax-error"],
    ["Neo.ClientError.Database.DatabaseNotFound", "invalid-request"],
    ["Neo.ClientError.Security.Unauthorized", "connect-failed"],
    ["ServiceUnavailable", "connect-failed"],
    ["SessionExpired", "connect-failed"],
  ])("%s → %s", (code, kind) => {
    expect(toApiError(neo4jError(code)).kind).toBe(kind);
  });

  /* why: AccessMode も Statement. で始まる。並べる順番を変えると構文エラーに化ける */
  it("AccessMode は構文エラーにしない", () => {
    expect(toApiError(neo4jError("Neo.ClientError.Statement.AccessMode")).kind).toBe(
      "read-only-violation",
    );
  });

  it("知らないコードは想定外にする", () => {
    expect(toApiError(neo4jError("Neo.DatabaseError.General.UnknownError"))).toEqual({
      kind: "unexpected",
      message: "想定外のエラーが起きました",
    });
  });

  it("コードを持たない値も想定外にする", () => {
    expect(toApiError("ただの文字列").kind).toBe("unexpected");
  });

  /* why: 想定外の中身を返すと実装の詳細が漏れる。ログにだけ残す */
  it("想定外はサーバの文を返さない", () => {
    expect(toApiError(neo4jError("Neo.DatabaseError.X", "内部の詳細")).message).not.toContain(
      "内部の詳細",
    );
  });

  it("返す文から資格情報を取り除く", () => {
    const cause = neo4jError("ServiceUnavailable", "failed: bolt://neo4j:hunter2@db:7687");

    expect(toApiError(cause).message).toBe("failed: bolt://db:7687");
  });
});

describe("detailOf", () => {
  it("Error でなくても文にする", () => {
    expect(detailOf(42)).toBe("42");
  });

  it("資格情報を取り除く", () => {
    expect(detailOf(new Error("bolt://u:p@h"))).toBe("bolt://h");
  });
});

describe("reportDriverError", () => {
  const captured = () => {
    const written: string[] = [];

    return {
      log: createLogger({ now: () => new Date(0), write: (line) => written.push(line) }),
      events: () => written.map((line) => JSON.parse(line) as Record<string, unknown>),
    };
  };

  /* why: 想定外の文はクライアントに返さない。ログに残さないと何が起きたか追えなくなる */
  it("想定外なら元の文をログに残す", () => {
    const { log, events } = captured();
    const api = reportDriverError(log, neo4jError("Neo.DatabaseError.General.Unknown"));

    expect(api).toEqual({ kind: "unexpected", message: "想定外のエラーが起きました" });
    expect(events()).toContainEqual(
      expect.objectContaining({ event: "error", message: "サーバからの文" }),
    );
  });

  it("分類できたらログに出さない", () => {
    const { log, events } = captured();
    const api = reportDriverError(log, neo4jError("Neo.ClientError.Statement.SyntaxError"));

    expect(api.kind).toBe("syntax-error");
    expect(events()).toEqual([]);
  });

  it("ログに残す文からも資格情報を取り除く", () => {
    const { log, events } = captured();

    reportDriverError(log, neo4jError("Unknown", "bolt://u:p@h で失敗"));

    expect(events()).toContainEqual(expect.objectContaining({ message: "bolt://h で失敗" }));
  });
});
