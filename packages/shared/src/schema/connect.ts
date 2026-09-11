import { z } from "zod";

/* why: 例は OpenAPI に載り、/docs の「試す」に初期値として入る。この URI を名前解決するのは
   api で、api はコンテナの中にいる。localhost では api 自身を指して繋がらない。
   password には例を置かない。コミットする openapi.json にパスワードの形を残さない */
export const ConnectRequestSchema = z.object({
  uri: z.string().min(1).meta({ example: "bolt://neo4j:7687" }),
  user: z.string().min(1).meta({ example: "neo4j" }),
  password: z.string().min(1),
  /* why: 省略すると既定のデータベースに繋ぐ。空文字を送っても同じ */
  database: z.string().optional().meta({ example: "neo4j" }),
});

export type ConnectRequest = z.infer<typeof ConnectRequestSchema>;

/* why: user と password を持たせない。無いことはスキーマに現れないので、ここに書く */
export const ConnectionStatusSchema = z.discriminatedUnion("connected", [
  z.object({ connected: z.literal(false) }),
  z.object({
    connected: z.literal(true),
    uri: z.string(),
    mode: z.enum(["manual", "dev-auto"]),
  }),
]);

export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;
