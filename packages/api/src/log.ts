import { redact } from "./redact";
import { currentReqId } from "./reqContext";

/* 出す項目は docs/03_api.md#8-ログ */
export type LogEvent =
  | Readonly<{ event: "req.start"; method: string; path: string }>
  | Readonly<{
      event: "query.run";
      cypher: string;
      readOnly: boolean;
      /** 長すぎて切ったときだけ付く。呼ぶ側は渡さない */
      truncated?: true;
    }>
  | Readonly<{ event: "req.end"; status: number; ms: number; rows?: number }>
  | Readonly<{ event: "error"; name: string; message: string; stack?: string }>;

export type LogLevel = "debug" | "info" | "warn" | "error";

export type Logger = (event: LogEvent, level?: LogLevel) => void;

export type LoggerDeps = Readonly<{
  now: () => Date;
  write: (line: string) => void;
  /** これより軽いものは書き出さない。既定は info なので debug は出ない */
  minLevel?: LogLevel;
}>;

const ORDER: Record<LogLevel, number> = { debug: 1, info: 2, warn: 3, error: 4 };

/* イベントごとの既定の重さ。呼ぶ側が上書きできる */
const LEVEL: Record<LogEvent["event"], LogLevel> = {
  "req.start": "info",
  "query.run": "info",
  "req.end": "info",
  error: "error",
};

/* why: 教材のクエリは長くても数百字。これを超えるのは想定外の入力で、頭が残っていれば
   何が来たかは判別できる（docs/03_api.md#実行クエリだけは出す） */
const MAX_CYPHER = 1000;

const shorten = (event: LogEvent): LogEvent =>
  event.event === "query.run" && event.cypher.length > MAX_CYPHER
    ? { ...event, cypher: event.cypher.slice(0, MAX_CYPHER), truncated: true }
    : event.event === "error"
      ? {
          ...event,
          message: redact(event.message),
          stack: event.stack === undefined ? undefined : redact(event.stack),
        }
      : event;

/**
 * 1 イベントを JSON 1 行にして書き出す。`minLevel` より軽いものは書き出さない。
 *
 * why: 時刻と出力先を渡させる。テストで固定でき、書き出し先を差し替えられる
 * （docs/02_architecture.md#時刻乱数を注入する）
 *
 * why: reqId だけは渡させない。渡させると、呼ぶ側が「今どのリクエストか」を知っている
 * 必要が出る。それを無くすために AsyncLocalStorage から引く
 *
 * @param minLevel 既定は info
 */
export const createLogger =
  ({ now, write, minLevel = "info" }: LoggerDeps): Logger =>
  (event, level = LEVEL[event.event]) => {
    if (ORDER[level] < ORDER[minLevel]) {
      return;
    }

    /* why: JSON.stringify は値が undefined の項目を出力しない。無い項目を消す処理を
       呼ぶ側に書かせずに済む */
    write(
      JSON.stringify({
        at: now().toISOString(),
        level,
        reqId: currentReqId(),
        ...shorten(event),
      }),
    );
  };
