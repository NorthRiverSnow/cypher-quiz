import { describe, expect, it } from "vite-plus/test";

import { err, flatMap, isOk, map, mapErr, ok, unwrapOr, type Result } from "./result";

const parseCount = (text: string): Result<number, string> => {
  const n = Number(text);

  return Number.isInteger(n) ? ok(n) : err(`整数ではない: ${text}`);
};

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
