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

  /* why: 書き込み系に実行ボタンを出すと、共有の DB が壊れる。
     writing 章の 5 枚に加えて、unwind の例も MERGE / SET を含む */
  it("書き込みを含むカードは実行できない", () => {
    const mutating = DECK.filter((card) => card.mutates);

    expect(mutating.map((card) => card.id).sort()).toEqual([
      "create",
      "delete",
      "foreach",
      "merge",
      "set",
      "unwind",
    ]);
    expect(mutating.every((card) => !card.runnable)).toBe(true);
  });

  /* why: 期待結果は任意。guide に実行結果が載っているカードだけが持つ
     （return と case は載っていないが、実行はできる） */
  it("実行できるカードは 18 枚", () => {
    expect(DECK.filter((card) => card.runnable)).toHaveLength(18);
  });

  /* why: 構文の列挙は 1 本のクエリにならない。実行ボタンを出すと必ず構文エラーになる */
  it.each(["edge", "listfn", "callproc"])("%s は構文の列挙なので実行できない", (id) => {
    expect(DECK.find((card) => card.id === id)?.runnable).toBe(false);
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

/* why: 実行できるカードの本文はそのまま Neo4j へ送られる。注釈が混ざると構文エラーになる */
describe("実行できるカードの本文", () => {
  const runnable = DECK.filter(
    (card): card is Card & Readonly<{ code: NonNullable<Card["code"]> }> =>
      card.runnable && card.code !== undefined,
  );

  it("1 枚以上ある", () => {
    expect(runnable.length).toBeGreaterThan(0);
  });

  it.each(runnable.map((card) => [card.id, card] as const))("%s に注釈が残らない", (_, card) => {
    for (const line of cypherOf(card.code).split("\n")) {
      expect(line.split("//")[0] ?? "").not.toMatch(/←/);
    }
  });
});

/* why: 書き込みは実行前に拒否される（docs/01_spec.md#実行は読み取り専用）。
   実行ボタンを出してから拒否するのは、押せると見せて裏切ること */
describe("実行できると書いたカード", () => {
  const WRITES = /\b(CREATE|MERGE|SET|DELETE|DETACH|REMOVE|FOREACH)\b/;

  it.each(DECK.filter((card) => card.runnable).map((card) => [card.id, card] as const))(
    "%s は書き込みを含まない",
    (_, card) => {
      expect(cypherOf(card.code ?? [])).not.toMatch(WRITES);
    },
  );

  it.each(DECK.filter((card) => card.mutates).map((card) => [card.id, card] as const))(
    "%s は書き込みなので実行ボタンを出さない",
    (_, card) => {
      expect(card.runnable).toBe(false);
    },
  );
});
