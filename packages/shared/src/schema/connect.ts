import { z } from "zod";

export const ConnectRequestSchema = z.object({
  uri: z.string().min(1),
  user: z.string().min(1),
  password: z.string().min(1),
  database: z.string().optional(),
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
