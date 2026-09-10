import { describe, expect, it } from "vite-plus/test";

import { type LogEvent, type LogLevel, createLogger } from "./log";
import { withReqId } from "./reqContext";

const AT = new Date("2026-09-09T10:31:02.441Z");
const REQ_ID = "a1f3";

const linesOf = (...events: readonly LogEvent[]): readonly string[] => {
  const written: string[] = [];
  const log = createLogger({ now: () => AT, write: (line) => written.push(line) });

  /* why: forEach をそのまま渡すと、要素の添字が第 2 引数（level）に入る */
  withReqId(REQ_ID, () => events.forEach((event) => log(event)));

  return written;
};

const capture = (minLevel?: LogLevel) => {
  const written: string[] = [];

  return {
    written,
    log: createLogger({ now: () => AT, write: (line) => written.push(line), minLevel }),
  };
};

const levelsOf = (written: readonly string[]): readonly string[] =>
  written.map((line) => (JSON.parse(line) as { level: string }).level);

const objectOf = (event: LogEvent): Record<string, unknown> =>
  JSON.parse(linesOf(event)[0] ?? "") as Record<string, unknown>;

describe("createLogger", () => {
  /* why: grep と jq が効く形。1 行に 1 イベント、改行を挟まない */
  it("1 イベントを JSON 1 行にする", () => {
    const [line] = linesOf({
      event: "req.start",
      method: "POST",
      path: "/api/run",
    });

    expect(line).toBe(
      '{"at":"2026-09-09T10:31:02.441Z","level":"info","reqId":"a1f3","event":"req.start","method":"POST","path":"/api/run"}',
    );
  });

  it("渡した時刻を使う", () => {
    expect(objectOf({ event: "req.start", method: "GET", path: "/" }).at).toBe(AT.toISOString());
  });

  it("error だけ level が error になる", () => {
    expect(objectOf({ event: "error", name: "TypeError", message: "壊れた" }).level).toBe("error");
    expect(objectOf({ event: "req.end", status: 500, ms: 4 }).level).toBe("info");
  });

  /* why: reqId は呼ぶ側が渡さない。同じリクエストの中で走った行に自動で載る */
  it("1 リクエストの行が同じ reqId で並ぶ", () => {
    const lines = linesOf(
      { event: "req.start", method: "POST", path: "/api/run" },
      { event: "query.run", cypher: "MATCH (n) RETURN n", readOnly: true },
      { event: "req.end", status: 200, ms: 47, rows: 1 },
    );

    expect(lines.map((line) => (JSON.parse(line) as { reqId: string }).reqId)).toEqual([
      "a1f3",
      "a1f3",
      "a1f3",
    ]);
  });

  it("実行したクエリをそのまま出す", () => {
    const cypher = "MATCH (n:Team) RETURN n.name";

    expect(objectOf({ event: "query.run", cypher, readOnly: true })).toMatchObject({
      cypher,
      readOnly: true,
    });
    expect(objectOf({ event: "query.run", cypher, readOnly: true })).not.toHaveProperty(
      "truncated",
    );
  });

  it("長すぎるクエリは切って、切ったことを残す", () => {
    const cypher = "A".repeat(1001);
    const logged = objectOf({ event: "query.run", cypher, readOnly: true });

    expect(logged.cypher).toBe("A".repeat(1000));
    expect(logged.truncated).toBe(true);
  });

  it("ちょうど上限までは切らない", () => {
    const cypher = "A".repeat(1000);

    expect(objectOf({ event: "query.run", cypher, readOnly: true })).not.toHaveProperty(
      "truncated",
    );
  });

  /* why: 利用者はクエリを編集して実行できる。URI もパスワードも書ける */
  it("実行クエリからも資格情報を取り除く", () => {
    const logged = objectOf({
      event: "query.run",
      cypher: "LOAD CSV FROM 'https://neo4j:hunter2@x/f.csv' AS r RETURN r",
      readOnly: false,
    });

    expect(logged.cypher).toBe("LOAD CSV FROM 'https://x/f.csv' AS r RETURN r");
  });

  /* why: 切ってから取り除くと、切れ目をまたいだ URI は @ を失って一致しなくなり、
     パスワードだけが残る */
  it("長すぎるクエリでも切る前に取り除く", () => {
    const secret = `${"x".repeat(6)}SECRET${"y".repeat(40)}`;
    const logged = objectOf({
      event: "query.run",
      cypher: `${"A".repeat(970)} bolt://neo4j:${secret}@db`,
      readOnly: true,
    });

    expect(logged.truncated).toBeUndefined();
    expect(logged.cypher).not.toContain("SECRET");
  });

  it("エラーの文から資格情報を取り除く", () => {
    const logged = objectOf({
      event: "error",
      name: "Neo4jError",
      message: "failed to connect to bolt://neo4j:hunter2@db:7687",
      stack: "at connect (bolt://neo4j:hunter2@db:7687)",
    });

    expect(logged.message).toBe("failed to connect to bolt://db:7687");
    expect(logged.stack).toBe("at connect (bolt://db:7687)");
  });

  it("スタックが無ければ項目ごと出さない", () => {
    expect(objectOf({ event: "error", name: "E", message: "x" })).not.toHaveProperty("stack");
  });

  /* why: 起動時と後始末はリクエストの外で走る。そこも書き出せないと困る */
  it("リクエストの外では - になる", () => {
    const { written, log } = capture();

    log({ event: "error", name: "E", message: "x" });

    expect(JSON.parse(written[0] ?? "")).toMatchObject({ reqId: "-" });
  });

  /* why: 行データは件数だけ。実行結果は数十行返ることがあり、ここが一番膨らむ */
  it("行は件数だけを出す", () => {
    expect(objectOf({ event: "req.end", status: 200, ms: 4, rows: 20 }).rows).toBe(20);
  });
});

describe("createLogger — 重さ", () => {
  const REQ_START: LogEvent = { event: "req.start", method: "GET", path: "/" };

  it("既定では debug を書き出さない", () => {
    const { written, log } = capture();

    log(REQ_START, "debug");

    expect(written).toEqual([]);
  });

  it("minLevel を debug にすれば書き出す", () => {
    const { written, log } = capture("debug");

    log(REQ_START, "debug");

    expect(levelsOf(written)).toEqual(["debug"]);
  });

  it("呼ぶ側が重さを上げられる", () => {
    const { written, log } = capture();

    log(REQ_START, "warn");

    expect(levelsOf(written)).toEqual(["warn"]);
  });

  /* why: debug < info < warn < error。minLevel より軽いものだけを止める */
  it("minLevel より重いものは全て書き出す", () => {
    const { written, log } = capture("warn");

    log(REQ_START, "debug");
    log(REQ_START, "info");
    log(REQ_START, "warn");
    log(REQ_START, "error");

    expect(levelsOf(written)).toEqual(["warn", "error"]);
  });

  it("重さを渡さなければイベントごとの既定になる", () => {
    const { written, log } = capture();

    log(REQ_START);
    log({ event: "error", name: "E", message: "x" });

    expect(levelsOf(written)).toEqual(["info", "error"]);
  });
});
