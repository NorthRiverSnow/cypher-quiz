import { z } from "zod";

/* ステータスとの対応は docs/03_api.md#主なエラー */
export const ERROR_KINDS = [
  "not-connected",
  "read-only-violation",
  "syntax-error",
  "timeout",
  "connect-failed",
] as const;

export const ApiErrorSchema = z.object({
  kind: z.enum(ERROR_KINDS),
  message: z.string(),
  /* read-only-violation のときだけ入る。サーバが返したクエリの分類（'rw' / 'w' / 's'） */
  queryType: z.string().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export type ErrorKind = ApiError["kind"];
