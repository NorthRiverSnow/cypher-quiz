import type { Cell, NodeValue, QueryResult } from "@cypher-quiz/shared";
import { describe, expect, it } from "vite-plus/test";

import { toResultCell, toResultTable } from "./result";

const node = (labels: readonly string[], props: Record<string, unknown>): NodeValue => ({
  kind: "node",
  labels: [...labels],
  props,
});

const TEAM = node(["Team"], { id: "T1", name: "Grid Operations", focus: "送電" });
const INCIDENT = node(["Incident"], { id: "INC-2101", title: "停電", severity: "SEV1" });

describe("素の値", () => {
  it.each([
    ["文字列", "telemetry-ingest", "telemetry-ingest"],
    ["数", 3, "3"],
    ["0", 0, "0"],
    ["真", true, "true"],
    ["偽", false, "false"],
  ] as const)("%s はそのまま文字にする", (_, cell, expected) => {
    expect(toResultCell(cell)).toBe(expected);
  });

  /* why: 空文字にしない。OPTIONAL MATCH の「一致しなかった」が見えなくなる */
  it("null は null と出す", () => {
    expect(toResultCell(null)).toBe("null");
  });

  it("空文字と null を区別できる", () => {
    expect(toResultCell("")).toBe("");
    expect(toResultCell(null)).toBe("null");
  });
});

describe("ノード", () => {
  it.each([
    ["Team", "team"],
    ["Engineer", "engineer"],
    ["Service", "service"],
    ["Incident", "incident"],
  ] as const)("%s は %s の色を持つ", (label, kind) => {
    expect(toResultCell(node([label], { name: "x" }))).toEqual({ kind, text: "x" });
  });

  it("name で出す", () => {
    expect(toResultCell(TEAM)).toEqual({ kind: "team", text: "Grid Operations" });
  });

  /* why: Incident だけ name を持たない（docs/05_reference.md） */
  it("name が無ければ id で出す", () => {
    expect(toResultCell(INCIDENT)).toEqual({ kind: "incident", text: "INC-2101" });
  });

  /* why: SET n:Upstream のカードでラベルが増える。並びは Neo4j が決めるので、
     先頭が既知とは限らない */
  it.each([
    ["既知が先", ["Service", "Upstream"]],
    ["既知が後", ["Upstream", "Service"]],
  ] as const)("ラベルが複数でも既知のものを使う（%s）", (_, labels) => {
    expect(toResultCell(node(labels, { name: "billing-engine" }))).toEqual({
      kind: "service",
      text: "billing-engine",
    });
  });

  /* why: 色は 4 つしか無い。知らないラベルは素の字で出す */
  it("知らないラベルは色を付けない", () => {
    expect(toResultCell(node(["Tmp"], { name: "x" }))).toBe("x");
  });

  /* why: 色はラベルから、字は props から決まる。名前が無くても色は付く */
  it("名前になる項目が無ければラベルを字にする", () => {
    expect(toResultCell(node(["Service", "Upstream"], { language: "Go" }))).toEqual({
      kind: "service",
      text: "(Service:Upstream)",
    });
  });

  it("知らないラベルで名前も無ければ、ラベルだけの素の字", () => {
    expect(toResultCell(node(["Tmp"], { x: 1 }))).toBe("(Tmp)");
  });
});

describe("ノード以外", () => {
  it("リレーションは型を出す", () => {
    expect(toResultCell({ kind: "relationship", type: "OWNS", props: {} })).toBe("[:OWNS]");
  });

  /* why: PathValue は向きを持たない。矢印が指すのは辿った順 */
  it("パスは辿った順に名前を並べる", () => {
    const path: Cell = {
      kind: "path",
      nodes: [
        node(["Service"], { name: "customer-portal" }),
        node(["Service"], { name: "outage-notifier" }),
      ],
      relationships: [{ kind: "relationship", type: "DEPENDS_ON", props: {} }],
    };

    expect(toResultCell(path)).toBe("customer-portal → outage-notifier");
  });

  it("マップは項目を並べる", () => {
    expect(toResultCell({ kind: "map", props: { name: "Grid Operations", size: 3 } })).toBe(
      '{ name: "Grid Operations", size: 3 }',
    );
  });

  it("マップの中の配列も並べる", () => {
    expect(toResultCell({ kind: "map", props: { tags: ["a", "b"] } })).toBe('{ tags: ["a", "b"] }');
  });

  it("リストは中身を並べる", () => {
    expect(toResultCell(["telemetry-ingest", "grid-monitor"])).toBe(
      "[telemetry-ingest, grid-monitor]",
    );
  });

  /* why: ResultCell は入れ子を持てない。リストの中のノードは文字に潰れる */
  it("リストの中のノードは色を持たない", () => {
    expect(toResultCell([TEAM, INCIDENT])).toBe("[Grid Operations, INC-2101]");
  });

  it("入れ子のリストも並べる", () => {
    expect(toResultCell([["a", "b"], ["c"]])).toBe("[[a, b], [c]]");
  });

  it("リストの中の null も見える", () => {
    expect(toResultCell(["a", null])).toBe("[a, null]");
  });
});

describe("表ぜんたい", () => {
  it("列名はそのまま、行だけ直す", () => {
    const result: QueryResult = {
      columns: ["t", "count"],
      rows: [
        [TEAM, 3],
        [INCIDENT, 0],
      ],
      elapsedMs: 7,
    };

    expect(toResultTable(result)).toEqual({
      columns: ["t", "count"],
      rows: [
        [{ kind: "team", text: "Grid Operations" }, "3"],
        [{ kind: "incident", text: "INC-2101" }, "0"],
      ],
    });
  });

  it("0 行でも列名は残る", () => {
    expect(toResultTable({ columns: ["n"], rows: [], elapsedMs: 1 })).toEqual({
      columns: ["n"],
      rows: [],
    });
  });
});
