import { describe, expect, it } from "vite-plus/test";

import { createRng, shuffle } from "./rng";

const take = (seed: number, count: number) => {
  const rng = createRng(seed);

  return Array.from({ length: count }, () => rng());
};

describe("createRng", () => {
  it("同じシードなら同じ列になる", () => {
    expect(take(42, 5)).toEqual(take(42, 5));
  });

  it("シードが違えば列も変わる", () => {
    expect(take(42, 5)).not.toEqual(take(43, 5));
  });

  it("0 以上 1 未満を返す", () => {
    const values = take(7, 200);

    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  /* why: 同じ値が続くと出題順が偏る。100 回で 90 種類は出る */
  it("値が固まらない", () => {
    expect(new Set(take(7, 100)).size).toBeGreaterThan(90);
  });
});

describe("shuffle", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8];

  it("元の配列を変えない", () => {
    const original = [...items];
    shuffle(items, createRng(1));

    expect(items).toEqual(original);
  });

  it("要素は増えも減りもしない", () => {
    const shuffled = shuffle(items, createRng(1));

    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
  });

  it("同じシードなら同じ並びになる", () => {
    expect(shuffle(items, createRng(3))).toEqual(shuffle(items, createRng(3)));
  });

  it("シードが違えば並びが変わる", () => {
    expect(shuffle(items, createRng(3))).not.toEqual(shuffle(items, createRng(4)));
  });

  /* why: 末尾を入れ替え忘れる実装があるので、最後の要素が動くことを見る */
  it("最後の要素も動く", () => {
    const last = Array.from({ length: 20 }, (_, seed) => shuffle(items, createRng(seed)).at(-1));

    expect(new Set(last).size).toBeGreaterThan(1);
  });
});
