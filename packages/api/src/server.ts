import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

import { recover } from "@cypher-quiz/shared";
import { serve } from "@hono/node-server";
import neo4j from "neo4j-driver";

import { createApi } from "./api";
import { type LogLevel, createLogger } from "./log";
import { createDriverStore } from "./neo4j/driverStore";

/* why: .env は docker compose と共有する 1 つだけ（docs/02_architecture.md#env-は-1-つ資格情報の出どころを分けない）。
   tsx は読まないのでここで読む。無くても既定で起動する */
recover(
  () => process.loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url))),
  undefined,
);

const PORT = Number(process.env.PORT ?? 8787);
const MINUTE = 60 * 1000;

/* why: 教材のクエリは一瞬で返る。これを超えるのは、止め方を間違えた可変長パスなど */
const QUERY_TIMEOUT_MS = 5000;
const LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

/* why: 知らない値を渡されたら既定に戻す。起動を止めるほどのことではない */
const levelOf = (value: string | undefined): LogLevel | undefined =>
  LEVELS.find((level) => level === value);

const log = createLogger({
  now: () => new Date(),
  write: (line) => process.stdout.write(`${line}\n`),
  minLevel: levelOf(process.env.LOG_LEVEL),
});

const store = createDriverStore({
  log,
  now: () => Date.now(),
  /* why: 推測できない値にする。クッキーに載る唯一の識別子で、これが漏れると
     他人の接続でクエリを実行できる */
  newId: () => randomBytes(24).toString("base64url"),
  createDriver: ({ uri, user, password }) => neo4j.driver(uri, neo4j.auth.basic(user, password)),
  idleMs: 30 * MINUTE,
  maxSessions: 20,
});

const app = createApi({
  log,
  store,
  timeoutMs: QUERY_TIMEOUT_MS,
  now: () => new Date(),
  newReqId: () => randomBytes(9).toString("base64url"),
  /* why: dev は http。Secure を付けるとブラウザがクッキーを送らず、
     繋がったまま切れたように見える */
  secure: process.env.NODE_ENV === "production",
});

const server = serve({ fetch: app.fetch, port: PORT }, ({ port }) => {
  process.stdout.write(`api: http://localhost:${port}\n`);
  process.stdout.write(`API リファレンス: http://localhost:${port}/docs\n`);
});

const FORCE_EXIT_MS = 3000;

/* why: 保険。SIGTERM に listener を付けると Node の既定（即終了）が無くなるので、
   閉じ忘れると二度と終われない。unref するのは、何も残っていなければ待たずに終わるため */
const stop = async () => {
  setTimeout(() => process.exit(1), FORCE_EXIT_MS).unref();

  server.close();

  /* why: keep-alive の接続は close() では切れない。http2 の型には無いので在るときだけ */
  if ("closeAllConnections" in server) {
    server.closeAllConnections();
  }

  /* why: 閉じ終えても process.exit を呼ばない。呼ぶと閉じ忘れがあっても 0 で終わり、
     終了コードが「全て閉じた」の証拠にならなくなる（test/shutdown.test.ts） */
  await store.closeAll();
};

/* why: once にする。Ctrl-C を連打しても終了処理が重ならない。アプリを閉じる時にセッションは全て終了する */
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    void stop();
  });
}
