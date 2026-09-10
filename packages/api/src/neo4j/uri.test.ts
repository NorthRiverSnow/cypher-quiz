import { isOk } from "@cypher-quiz/shared";
import { describe, expect, it } from "vite-plus/test";

import { isLocal, secureUri } from "./uri";

const uriOf = (uri: string) => {
  const result = secureUri(uri);

  return isOk(result) ? result.value : result.error.kind;
};

describe("secureUri — ローカルはそのまま", () => {
  it.each([
    "bolt://localhost:7687",
    "neo4j://127.0.0.1:7687",
    "bolt://[::1]:7687",
    "neo4j://neo4j:7687",
    "bolt://neo4j-test:7687",
  ])("%s", (uri) => {
    expect(uriOf(uri)).toBe(uri);
  });

  /* why: URL は特殊でないスキームのホスト名を小文字にしない */
  it("大文字で書かれてもローカルと分かる", () => {
    expect(uriOf("bolt://LOCALHOST:7687")).toBe("bolt://LOCALHOST:7687");
  });
});

describe("secureUri — ローカル以外は繋ぎ変える", () => {
  /* why: 平文のまま外へ出すとパスワードがネットワークに流れる */
  it.each([
    ["bolt://db.example.com:7687", "bolt+s://db.example.com:7687"],
    ["neo4j://abc.databases.neo4j.io", "neo4j+s://abc.databases.neo4j.io"],
  ])("%s → %s", (given, expected) => {
    expect(uriOf(given)).toBe(expected);
  });

  it.each([
    "bolt+s://abc.databases.neo4j.io",
    "neo4j+s://abc.databases.neo4j.io",
    "bolt+ssc://db.example.com",
    "neo4j+ssc://db.example.com",
  ])("既に暗号化されていればそのまま: %s", (uri) => {
    expect(uriOf(uri)).toBe(uri);
  });

  /* why: ポートもパスも残す。繋ぎ変えるのはスキームだけ */
  it("スキームだけを差し替える", () => {
    expect(uriOf("bolt://db.example.com:7999")).toBe("bolt+s://db.example.com:7999");
  });
});

describe("secureUri — 断るもの", () => {
  it.each(["http://db.example.com", "ftp://x", "db.example.com:7687", "こわれている"])(
    "%s は invalid-request",
    (uri) => {
      expect(uriOf(uri)).toBe("invalid-request");
    },
  );

  /* why: URI に埋めた資格情報はドライバが受け取らない。先に断る */
  it("資格情報を埋めた URI は断る", () => {
    expect(uriOf("bolt://neo4j:hunter2@db.example.com")).toBe("invalid-request");
  });

  it("断る文に URI を入れない", () => {
    const result = secureUri("bolt://neo4j:hunter2@db.example.com");

    expect(isOk(result) ? "" : result.error.message).not.toContain("hunter2");
  });
});

describe("isLocal", () => {
  it("compose のサービス名もローカル扱い", () => {
    expect(isLocal("neo4j")).toBe(true);
    expect(isLocal("db.example.com")).toBe(false);
  });
});
