import type {
  Cell,
  NodeValue,
  PathValue,
  QueryResult,
  RelationshipValue,
} from "@cypher-quiz/shared";
import neo4j, {
  type Integer,
  type Node,
  type Path,
  type QueryResult as DriverResult,
  type Relationship,
} from "neo4j-driver";

/* why: Integer は 64 bit。number にすると 2^53 を超えた桁が静かに変わる。
   桁を保つほうを選び、安全域の外は文字列で返す */
const fromInteger = (value: Integer): number | string =>
  value.inSafeRange() ? value.toNumber() : value.toString();

/* why: Cypher のマップも Neo4j の一時型・空間型も typeof は "object"。
   素のオブジェクトだけがこのプロトタイプを持つ（Date や Point はクラス） */
const isPlainMap = (value: object): value is Record<string, unknown> => {
  const proto: unknown = Object.getPrototypeOf(value);

  return proto === Object.prototype || proto === null;
};

type HasText = { toString: () => string };

/* why: 既定の toString しか持たないクラスは "[object Object]" にしかならない */
const hasText = (value: object): value is HasText => value.toString !== Object.prototype.toString;

/* why: value.toString() を直に呼ぶと no-base-to-string の警告が出る。toString を宣言した
   型で受け直して、上書きを確かめてから呼んでいることを型で示す */
const textOf = (value: HasText): string => value.toString();

const propsOf = (props: Record<string, unknown>): Record<string, Cell> =>
  Object.fromEntries(Object.entries(props).map(([key, value]) => [key, toCell(value)]));

const fromNode = (node: Node): NodeValue => ({
  kind: "node",
  labels: [...node.labels],
  props: propsOf(node.properties),
});

const fromRelationship = (relationship: Relationship): RelationshipValue => ({
  kind: "relationship",
  type: relationship.type,
  props: propsOf(relationship.properties),
});

/* why: start は segments に現れない。長さ 0 のパスは segments が空でノード 1 つになる */
const fromPath = (path: Path): PathValue => ({
  kind: "path",
  nodes: [fromNode(path.start), ...path.segments.map((segment) => fromNode(segment.end))],
  relationships: path.segments.map((segment) => fromRelationship(segment.relationship)),
});

/**
 * ドライバの値 1 つを素の JSON に変える。対応は docs/03_api.md#セル-1-つの対応
 *
 * why: 表記を持たないものは null にする。"[object Object]" を返すと、値が無いのか
 * 変換に失敗したのかを受け取った側が区別できない
 */
export const toCell = (value: unknown): Cell => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (neo4j.isInt(value)) {
    return fromInteger(value);
  }
  if (neo4j.isNode(value)) {
    return fromNode(value);
  }
  if (neo4j.isRelationship(value)) {
    return fromRelationship(value);
  }
  if (neo4j.isPath(value)) {
    return fromPath(value);
  }
  if (Array.isArray(value)) {
    return value.map((item: unknown) => toCell(item));
  }
  if (typeof value !== "object") {
    return null;
  }

  return isPlainMap(value)
    ? { kind: "map", props: propsOf(value) }
    : hasText(value)
      ? textOf(value)
      : null;
};

/**
 * ドライバの結果を、クライアントに返す形にする。DB にも I/O にも触らない。
 *
 * @param keys 列名。RETURN に書かれた順（docs/03_api.md#列名は結果から取れない）
 */
export const toPlainJson = (keys: readonly string[], result: DriverResult): QueryResult => ({
  columns: [...keys],
  rows: result.records.map((record) => [...record.values()].map((value) => toCell(value))),
  /* why: 届くまでと読み終わるまでの合計がサーバ側の所要時間 */
  elapsedMs:
    result.summary.resultAvailableAfter.toNumber() + result.summary.resultConsumedAfter.toNumber(),
});
