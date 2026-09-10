import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createApi } from "../src/api";
import { createLogger } from "../src/log";
import { createDriverStore } from "../src/neo4j/driverStore";

/* why: ドキュメントはルートの宣言だけから組み立てられる。ハンドラも DB も
   呼ばれないので、依存は「作れる」だけでよい——繋ぎに行ったら間違いなので throw する */
const document = () => {
  const log = createLogger({ now: () => new Date(0), write: () => undefined });

  return createApi({
    log,
    now: () => new Date(0),
    newReqId: () => "-",
    secure: false,
    timeoutMs: 0,
    store: createDriverStore({
      log,
      now: () => 0,
      newId: () => "-",
      createDriver: () => {
        throw new Error("ドキュメント生成では DB に繋がない");
      },
      idleMs: 0,
      maxSessions: 0,
    }),
  }).getOpenAPI31Document({
    openapi: "3.1.0",
    info: { title: "cypher-quiz API", version: "0.1.0" },
  });
};

/* why: cwd ではなくこのファイルからの相対で解決する。どこから実行しても同じ場所に書く */
const target = fileURLToPath(new URL("../../../openapi/openapi.json", import.meta.url));
const next = `${JSON.stringify(document(), null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(target, "utf8");

  if (current !== next) {
    console.error("openapi.json が古い。vp run openapi:write で更新する");
    process.exit(1);
  }

  console.log("openapi.json は最新");
} else {
  writeFileSync(target, next);
  console.log(`書き出した: ${target}`);
}
