import { z } from "zod";

/* 変換の規則は docs/03_api.md#5-neo4j-の型を-json-にする */
export const NodeValueSchema = z.object({
  kind: z.literal("node"),
  labels: z.array(z.string()),
  props: z.record(z.string(), z.unknown()),
});

export const CellSchema = z.union([z.string(), z.number(), z.boolean(), z.null(), NodeValueSchema]);

export type Cell = z.infer<typeof CellSchema>;

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
