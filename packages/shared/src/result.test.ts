import { describe, expect, it } from "vite-plus/test";

import {
  attempt,
  attemptAsync,
  err,
  flatMap,
  isOk,
  map,
  mapErr,
  ok,
  recover,
  unwrapOr,
  type Result,
} from "./result";

const parseCount = (text: string): Result<number, string> => {
  const n = Number(text);

  return Number.isInteger(n) ? ok(n) : err(`整数ではない: ${text}`);
};

const boom = (): never => {
  throw new Error("QuotaExceededError");
};

describe("attempt", () => {
  it("throw しなければ戻り値を包む", () => {
    expect(
      attempt(
        () => 13,
        () => "だめ",
      ),
    ).toEqual(ok(13));
  });

  /* why: 捕まえた値をそのまま持ち回らせない。扱えるエラーに変えることを型で強制する */
  it("捕まえた値を自分のエラー型に変える", () => {
    expect(attempt(boom, (cause) => (cause as Error).message)).toEqual(err("QuotaExceededError"));
    expect(attempt(boom, () => "store-unavailable" as const)).toEqual(err("store-unavailable"));
  });

  it("呼ぶ側に例外を投げない", () => {
    expect(() => attempt(boom, () => "だめ")).not.toThrow();
  });
});

describe("recover", () => {
  it("throw しなければ戻り値をそのまま返す", () => {
    expect(recover(() => 13, 0)).toBe(13);
  });

  /* why: 知らせる必要のない失敗に使う。壊れた保存を空から始めるのがこれ */
  it("throw したら代わりの値で続ける", () => {
    expect(recover((): number => JSON.parse("{壊れている"), 0)).toBe(0);
  });

  it("呼ぶ側に例外を投げない", () => {
    expect(() => recover(boom, "代わり")).not.toThrow();
  });
});

describe("Result", () => {
  it("成功は値を持ち、失敗は理由を持つ", () => {
    expect(parseCount("13")).toEqual({ ok: true, value: 13 });
    expect(parseCount("13.5")).toEqual({ ok: false, error: "整数ではない: 13.5" });
  });

  it("map は成功だけに掛かる", () => {
    expect(map(parseCount("13"), (n) => n * 2)).toEqual(ok(26));
    expect(map(parseCount("x"), (n) => n * 2)).toEqual(err("整数ではない: x"));
  });

  it("mapErr は失敗だけに掛かる", () => {
    expect(mapErr(parseCount("13"), (reason) => reason.length)).toEqual(ok(13));
    expect(mapErr(parseCount("x"), () => "だめ")).toEqual(err("だめ"));
  });

  /* why: 失敗を連ねても最初の理由が残る。後段の関数は呼ばれない */
  it("flatMap は失敗で止まる", () => {
    const half = (n: number): Result<number, string> =>
      n % 2 === 0 ? ok(n / 2) : err(`奇数: ${n}`);

    expect(flatMap(parseCount("14"), half)).toEqual(ok(7));
    expect(flatMap(parseCount("13"), half)).toEqual(err("奇数: 13"));
    expect(flatMap(parseCount("x"), half)).toEqual(err("整数ではない: x"));
  });

  it("unwrapOr は失敗のときだけ代わりの値を返す", () => {
    expect(unwrapOr(parseCount("13"), 0)).toBe(13);
    expect(unwrapOr(parseCount("x"), 0)).toBe(0);
  });

  /* why: 型の絞り込みに使う。isOk を通した後は value を参照できる */
  it("isOk で成功だけを絞り込める", () => {
    const results = [parseCount("1"), parseCount("x"), parseCount("3")];

    expect(results.filter(isOk).map((result) => result.value)).toEqual([1, 3]);
  });
});

describe("attemptAsync", () => {
  it("解決した値を ok で返す", async () => {
    expect(
      await attemptAsync(
        async () => 1,
        () => "失敗" as const,
      ),
    ).toEqual({ ok: true, value: 1 });
  });

  it("reject した理由を扱えるエラーに変える", async () => {
    const result = await attemptAsync(
      () => Promise.reject(new Error("壊れた")),
      (cause) => (cause instanceof Error ? cause.message : "不明"),
    );

    expect(result).toEqual({ ok: false, error: "壊れた" });
  });

  /* why: await の前に投げられた例外も同じ扱いにする。同期の throw だけ素通りすると、
     呼ぶ側が 2 通りの失敗に備えることになる */
  it("await の前に throw しても捕まえる", async () => {
    const result = await attemptAsync(
      () => {
        throw new Error("すぐ壊れた");
      },
      () => "捕まえた" as const,
    );

    expect(result).toEqual({ ok: false, error: "捕まえた" });
  });

  it("Error でない値も捕まえる", async () => {
    const result = await attemptAsync(
      () => Promise.reject("文字列"),
      (cause) => cause,
    );

    expect(result).toEqual({ ok: false, error: "文字列" });
  });
});
