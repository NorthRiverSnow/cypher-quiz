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
