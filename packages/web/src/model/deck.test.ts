import { describe, expect, it } from "vite-plus/test";

import { SECTION_LABELS } from "../types";
import { type Card, cypherOf } from "./deck";
import { DECK } from "./deck.data";

describe("DECK", () => {
  it("30 枚ある", () => {
    expect(DECK).toHaveLength(30);
  });

  it("id は重複しない", () => {
    expect(new Set(DECK.map((card) => card.id)).size).toBe(DECK.length);
  });

  it("章は 6 つで、枚数は教材どおり", () => {
    const counts: Record<string, number> = {};
    for (const card of DECK) counts[card.section] = (counts[card.section] ?? 0) + 1;

    expect(counts).toEqual({
      skeleton: 5,
      patterns: 6,
      shaping: 4,
      lists: 6,
      writing: 5,
      subqueries: 4,
    });
    expect(Object.keys(counts).every((section) => section in SECTION_LABELS)).toBe(true);
  });

  it("どのカードも名前と役割とコードを持つ", () => {
    const empty = DECK.filter(
      (card) => card.name === "" || card.role === "" || (card.code?.length ?? 0) === 0,
    );

    expect(empty).toEqual([]);
  });

  /* why: 書き込みのカードには編集欄を出さない。writing 章の 5 枚に加えて、
     unwind の例も MERGE / SET を含む */
  /* why: 一覧は 1 本のクエリにならない。押す前に書き換えを促す
     （docs/01_spec.md#4-クエリの実行と編集） */
  it("構文の一覧はこの 5 枚", () => {
    expect(
      DECK.filter((card) => card.listing)
        .map((card) => card.id)
        .sort(),
    ).toEqual(["callproc", "distinct", "edge", "listfn", "node"]);
  });

  it("書き込みのカードに一覧の印は要らない", () => {
    expect(DECK.filter((card) => card.mutates && card.listing)).toEqual([]);
  });

  it("書き込みを含むのはこの 7 枚", () => {
    expect(
      DECK.filter((card) => card.mutates)
        .map((card) => card.id)
        .sort(),
    ).toEqual(["create", "delete", "foreach", "merge", "schema", "set", "unwind"]);
  });

  /* why: 空白で桁を揃えた実測値をそのまま出す。ResultBlock は折り返さない */
  it("期待結果は改行と桁を保つ", () => {
    const match = DECK.find((card) => card.id === "match");

    expect(match?.expected).toBe(
      "telemetry-ingest   Go\ngrid-monitor       Go\ndispatch-optimizer Python\n3 行",
    );
  });

  /* why: bad（誤りの提示）は 30 枚には出てこない。CodeBlock は受け取れる */
  it("コードの色分けは kw / rel / hl / cm / note と素の字だけ", () => {
    const kinds = new Set(DECK.flatMap((card) => card.code ?? []).map((segment) => segment.kind));

    expect(
      [...kinds].filter((kind) => kind !== undefined).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["cm", "hl", "kw", "note", "rel"]);
    expect(kinds.has(undefined)).toBe(true);
  });
});

describe("cypherOf", () => {
  /* why: note は読み手への注釈で Cypher ではない。送ると構文エラーになる */
  it("note を落とす", () => {
    const code = [
      { text: "MATCH (n)" },
      { text: "  ← ここが起点", kind: "note" as const },
      { text: "\nRETURN n" },
    ];

    expect(cypherOf(code)).toBe("MATCH (n)\nRETURN n");
  });

  it("コメントは残す", () => {
    const code = [{ text: "// 全チーム\n", kind: "cm" as const }, { text: "MATCH (t:Team)" }];

    expect(cypherOf(code)).toBe("// 全チーム\nMATCH (t:Team)");
  });

  it("区切りを繋いで 1 本にする", () => {
    expect(cypherOf([{ text: "MATCH", kind: "kw" }, { text: " (n)" }])).toBe("MATCH (n)");
  });
});

const withCode = DECK.filter(
  (card): card is Card & Readonly<{ code: NonNullable<Card["code"]> }> => card.code !== undefined,
);

/* why: cypherOf が note を落とすので、注釈が note として書かれていれば送られない。
   ここが見張るのは「注釈を cm と書き間違えていないか」 */
describe("カードの本文に注釈が残らない", () => {
  it("code を持つカードが 1 枚以上ある", () => {
    expect(withCode.length).toBeGreaterThan(0);
  });

  it.each(withCode.map((card) => [card.id, card] as const))("%s", (_, card) => {
    for (const line of cypherOf(card.code).split("\n")) {
      expect(line.split("//")[0] ?? "").not.toMatch(/←/);
    }
  });
});

/* why: 編集欄を出すカードが書き込みを含むと、押した瞬間に必ず拒否される。
   押せると見せて裏切ることになる（docs/01_spec.md#実行は読み取り専用） */
describe("編集欄を出すカードは書き込みを含まない", () => {
  const WRITES = /\b(CREATE|MERGE|SET|DELETE|DETACH|REMOVE|FOREACH)\b/;

  it.each(withCode.filter((card) => !card.mutates).map((card) => [card.id, card] as const))(
    "%s",
    (_, card) => {
      expect(cypherOf(card.code)).not.toMatch(WRITES);
    },
  );
});
