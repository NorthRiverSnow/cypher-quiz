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
  now: () => new Date(),
  newReqId: () => randomBytes(9).toString("base64url"),
  /* why: dev は http。Secure を付けるとブラウザがクッキーを送らず、
     繋がったまま切れたように見える */
  secure: process.env.NODE_ENV === "production",
});

serve({ fetch: app.fetch, port: PORT }, ({ port }) => {
  process.stdout.write(`api: http://localhost:${port}\n`);
  process.stdout.write(`API リファレンス: http://localhost:${port}/docs\n`);
});
