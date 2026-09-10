import { describe, expect, it } from "vite-plus/test";

import { redact } from "./redact";

describe("redact", () => {
  it("URI から利用者名とパスワードを取り除く", () => {
    expect(redact("neo4j+s://neo4j:hunter2@xxxx.databases.neo4j.io")).toBe(
      "neo4j+s://xxxx.databases.neo4j.io",
    );
  });

  it("利用者名だけでも取り除く", () => {
    expect(redact("bolt://neo4j@localhost:7687")).toBe("bolt://localhost:7687");
  });

  /* why: ドライバの例外は URI を文の途中に埋める。前後が付いていても取り除けること */
  it("文の途中に埋まっていても取り除く", () => {
    expect(redact("Could not perform discovery to bolt://neo4j:pw@db:7687 after 3 tries")).toBe(
      "Could not perform discovery to bolt://db:7687 after 3 tries",
    );
  });

  it("複数あればすべて取り除く", () => {
    expect(redact("a bolt://u:p@x b neo4j://u2:p2@y")).toBe("a bolt://x b neo4j://y");
  });

  it("資格情報が無ければそのまま返す", () => {
    expect(redact("bolt://localhost:7687 に繋げません")).toBe("bolt://localhost:7687 に繋げません");
  });

  /* why: メールアドレスを含む文を壊さない。@ の前に scheme:// が無ければ対象にしない */
  it("URI でない @ は残す", () => {
    expect(redact("yuki@example.com に連絡する")).toBe("yuki@example.com に連絡する");
  });
});

/* why: 利用者はクエリを編集して実行できる。第 1 層が拒否しても、何を止めたかを残すために
   query.run には出るので、書かれたパスワードは伏せてから出す */
describe("redact — Cypher に書かれたパスワード", () => {
  it("CREATE USER のパスワードを伏せる", () => {
    expect(redact("CREATE USER bob SET PASSWORD 'hunter2'")).toBe(
      "CREATE USER bob SET PASSWORD '***'",
    );
  });

  it("大文字小文字と改行を挟んでも伏せる", () => {
    expect(redact("create user bob set password\n  'hunter2'")).toBe(
      "create user bob set password\n  '***'",
    );
  });

  it("二重引用符でも伏せる", () => {
    expect(redact('ALTER USER bob SET PASSWORD "hunter2"')).toBe(
      "ALTER USER bob SET PASSWORD '***'",
    );
  });

  /* why: 変更は 2 つ並ぶ。片方だけ伏せても意味がない */
  it("FROM と TO の両方を伏せる", () => {
    expect(redact("ALTER CURRENT USER SET PASSWORD FROM 'old' TO 'new'")).toBe(
      "ALTER CURRENT USER SET PASSWORD FROM '***' TO '***'",
    );
  });

  it("LOAD CSV の URI も取り除く", () => {
    expect(redact("LOAD CSV FROM 'https://u:p@example.com/f.csv' AS row RETURN row")).toBe(
      "LOAD CSV FROM 'https://example.com/f.csv' AS row RETURN row",
    );
  });

  /* why: PASSWORD という語を含むだけのプロパティ名を壊さない */
  it("リテラルが続かなければそのまま", () => {
    expect(redact("MATCH (u) RETURN u.password_changed_at")).toBe(
      "MATCH (u) RETURN u.password_changed_at",
    );
  });
});
