import { describe, expect, it } from "vite-plus/test";

import { allDone, type Box, isDone, nextBox } from "./leitner";

describe("nextBox", () => {
  it("正解で 1 つ進む", () => {
    expect(nextBox(0, true)).toBe(1);
    expect(nextBox(1, true)).toBe(2);
  });

  /* why: 完了の先は無い。2 回連続の正解が完了条件なので、進め続けても意味がない */
  it("完了からは進まない", () => {
    expect(nextBox(2, true)).toBe(2);
  });

  /* why: 1 回正解していても 0 に戻す。2 回続けて正解して初めて完了 */
  it("不正解はどの箱からでも 0 に戻る", () => {
    expect(nextBox(0, false)).toBe(0);
    expect(nextBox(1, false)).toBe(0);
    expect(nextBox(2, false)).toBe(0);
  });

  it("2 回続けて正解すると完了する", () => {
    expect(isDone(nextBox(nextBox(0, true), true))).toBe(true);
  });

  it("間に不正解が挟まると完了しない", () => {
    const box = [true, false, true].reduce<Box>((acc, correct) => nextBox(acc, correct), 0);

    expect(box).toBe(1);
    expect(isDone(box)).toBe(false);
  });
});

describe("集計", () => {
  const boxes: Box[] = [0, 0, 1, 2, 2, 2];

  it("全て完了したかを見る", () => {
    expect(allDone(boxes)).toBe(false);
    expect(allDone([2, 2, 2])).toBe(true);
  });

  /* why: 空なら「全部完了」。出題が 0 件のときに完了扱いにする */
  it("空は完了扱い", () => {
    expect(allDone([])).toBe(true);
  });
});
