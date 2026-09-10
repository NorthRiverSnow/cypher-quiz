import { z } from "zod";

/* 変換の規則は docs/03_api.md#5-結果の正規化 */
const ScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

/* why: props の値は絞らない。Neo4j は素の値と、その配列しか入れられないが、
   一時型・空間型を文字列にした結果も混ざる。View は表示のために String() を通す */
const PropsSchema = z.record(z.string(), z.unknown());

export const NodeValueSchema = z.object({
  kind: z.literal("node"),
  labels: z.array(z.string()),
  props: PropsSchema,
});

export const RelationshipValueSchema = z.object({
  kind: z.literal("relationship"),
  type: z.string(),
  props: PropsSchema,
});

/* why: segments のまま渡すと View が繋ぎ直すことになる。ノードとリレーションの列に
   ほどく。長さ 0 のパスもあるので nodes は常に relationships より 1 つ多い */
export const PathValueSchema = z.object({
  kind: z.literal("path"),
  nodes: z.array(NodeValueSchema),
  relationships: z.array(RelationshipValueSchema),
});

/* why: 素の JS オブジェクトにすると、ノードとの区別がスキーマから消える
   （`{ kind: 'node' }` を返すマップと本物のノードが同じ形になる）。タグを付けて分ける */
export const MapValueSchema = z.object({
  kind: z.literal("map"),
  props: PropsSchema,
});

export type NodeValue = z.infer<typeof NodeValueSchema>;
export type RelationshipValue = z.infer<typeof RelationshipValueSchema>;
export type PathValue = z.infer<typeof PathValueSchema>;
export type MapValue = z.infer<typeof MapValueSchema>;

export type Cell =
  | string
  | number
  | boolean
  | null
  | NodeValue
  | RelationshipValue
  | PathValue
  | MapValue
  | CellList;

/* why: interface にすると TypeScript が展開を遅らせる。type の配列で書くと、
   Hono の応答の型が「excessively deep」で解決できなくなる */
export interface CellList extends ReadonlyArray<Cell> {}

/* why: リストは自分自身を含む（`collect()` の入れ子）。z.lazy で参照を遅らせないと、
   定義の途中で自分を読むことになる

   why: id を付けると OpenAPI が $ref にする。付けないと、自分を含む形を展開し続けて
   スタックが尽きる（docs/03_api.md#再帰するスキーマには-id-を付ける） */
export const CellSchema: z.ZodType<Cell> = z
  .lazy(() =>
    z.union([
      ScalarSchema,
      NodeValueSchema,
      RelationshipValueSchema,
      PathValueSchema,
      MapValueSchema,
      z.array(CellSchema),
    ]),
  )
  .meta({ id: "Cell" });

export const RunRequestSchema = z.object({
  cypher: z.string().min(1),
});

export type RunRequest = z.infer<typeof RunRequestSchema>;

export const QueryResultSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.array(CellSchema)),
  /** サーバ側で測った値。クライアントの往復時間は含まない */
  elapsedMs: z.number(),
});

export type QueryResult = z.infer<typeof QueryResultSchema>;
