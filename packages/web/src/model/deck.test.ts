import { describe, expect, it } from "vite-plus/test";

import { SECTION_LABELS } from "../types";
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

  /* why: 書き込み系に実行ボタンを出すと、共有の DB が壊れる */
  it("書き込み系の 5 枚は実行できない", () => {
    const mutating = DECK.filter((card) => card.mutates);

    expect(mutating.map((card) => card.id)).toEqual([
      "create",
      "merge",
      "set",
      "delete",
      "foreach",
    ]);
    expect(mutating.every((card) => !card.runnable)).toBe(true);
  });

  it("実行できる 20 枚は期待結果を持つ", () => {
    const runnable = DECK.filter((card) => card.runnable);

    expect(runnable).toHaveLength(20);
    expect(runnable.every((card) => card.expected !== undefined)).toBe(true);
  });

  /* why: 空白で桁を揃えた実測値をそのまま出す。ResultBlock は折り返さない */
  it("期待結果は改行と桁を保つ", () => {
    const match = DECK.find((card) => card.id === "match");

    expect(match?.expected).toBe(
      "telemetry-ingest   Go\ngrid-monitor       Go\ndispatch-optimizer Python\n3 行",
    );
  });

  /* why: bad（誤りの提示）は 30 枚には出てこない。CodeBlock は受け取れる */
  it("コードの色分けは kw / rel / hl / cm と素の字だけ", () => {
    const kinds = new Set(DECK.flatMap((card) => card.code ?? []).map((segment) => segment.kind));

    expect(
      [...kinds].filter((kind) => kind !== undefined).sort((a, b) => a.localeCompare(b)),
    ).toEqual(["cm", "hl", "kw", "rel"]);
    expect(kinds.has(undefined)).toBe(true);
  });
});
