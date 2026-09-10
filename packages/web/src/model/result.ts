import type {
  Cell,
  MapValue,
  NodeValue,
  PathValue,
  QueryResult,
  RelationshipValue,
} from "@cypher-quiz/shared";

import type { EntityKind, ResultCell } from "../types";

/* why: ラベルは複数付く（`SET n:Upstream` のカード）。既知のものを先に見つけた順で使う */
const KIND_OF: Readonly<Record<string, EntityKind>> = {
  Team: "team",
  Engineer: "engineer",
  Service: "service",
  Incident: "incident",
};

/* 値は docs/05_reference.md のデータセット。Incident だけ name を持たない */
const NAMING = ["name", "id", "title"] as const;

type Props = NodeValue["props"];

const isNode = (cell: Cell): cell is NodeValue =>
  typeof cell === "object" && cell !== null && "kind" in cell && cell.kind === "node";

const scalar = (cell: string | number | boolean | null): string =>
  /* why: 空文字にしない。値が無いのか空文字なのかを、見ただけで区別できなくなる */
  cell === null ? "null" : String(cell);

/** ノードやマップの見出しに使う名前。無ければ `undefined` */
const named = (props: Props): string | undefined => {
  const found = NAMING.map((key) => props[key]).find((value) => typeof value === "string");

  return found === undefined ? undefined : String(found);
};

const kindOf = ({ labels }: NodeValue): EntityKind | undefined =>
  labels.map((label) => KIND_OF[label]).find((kind) => kind !== undefined);

const nodeText = (node: NodeValue): string => named(node.props) ?? `(${node.labels.join(":")})`;

/* why: props の値は Cell ではない。素の値と、その配列と、
   一時型・空間型を toString() した文字列が入る（docs/03_api.md#セル-1-つの対応） */
const propText = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(propText).join(", ")}]`;
  }

  return value === null || value === undefined ? "null" : JSON.stringify(value) || "null";
};

const mapText = ({ props }: MapValue): string =>
  `{${Object.entries(props)
    .map(([key, value]) => ` ${key}: ${propText(value)}`)
    .join(",")} }`;

const relationshipText = ({ type }: RelationshipValue): string => `[:${type}]`;

/* why: PathValue は向きを持たない。矢印が指すのは「辿った順」で、リレーションの向きではない
   （docs/02_architecture.md#実行結果をセルに直す） */
const pathText = ({ nodes }: PathValue): string => nodes.map(nodeText).join(" → ");

/** 1 つのセルを文字にする。**色は付けない**——付くのはノードが単独で返ったときだけ */
const text = (cell: Cell): string => {
  if (typeof cell !== "object" || cell === null) {
    return scalar(cell);
  }

  /* why: Array.isArray は CellList（interface で書いた再帰型）を union から外せない。
     タグの有無で分ける */
  if (!("kind" in cell)) {
    return `[${cell.map(text).join(", ")}]`;
  }

  switch (cell.kind) {
    case "node":
      return nodeText(cell);
    case "relationship":
      return relationshipText(cell);
    case "path":
      return pathText(cell);
    default:
      return mapText(cell);
  }
};

/**
 * `/api/run` の 1 セルを、結果表に出せる形へ直す。
 *
 * why: 色が付くのはノードが単独で返ったときだけ。リストの中のノードは文字に潰れる
 * ——`ResultCell` が入れ子を持てないため
 */
export const toResultCell = (cell: Cell): ResultCell => {
  if (!isNode(cell)) {
    return text(cell);
  }

  const kind = kindOf(cell);

  return kind === undefined ? nodeText(cell) : { kind, text: nodeText(cell) };
};

export type ResultTableData = Readonly<{
  columns: readonly string[];
  rows: readonly (readonly ResultCell[])[];
}>;

export const toResultTable = ({ columns, rows }: QueryResult): ResultTableData => ({
  columns,
  rows: rows.map((row) => row.map(toResultCell)),
});
