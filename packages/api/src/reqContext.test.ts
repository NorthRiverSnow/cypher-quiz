import { describe, expect, it } from "vite-plus/test";

import { currentReqId, withReqId } from "./reqContext";

describe("withReqId", () => {
  it("中では渡した値を引ける", () => {
    expect(withReqId("r1", () => currentReqId())).toBe("r1");
  });

  /* why: DB もルートも await の先で走る。追随しないと引数で持ち回るしかなくなる */
  it("await をまたいでも引ける", async () => {
    const later = await withReqId("r1", async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));

      return currentReqId();
    });

    expect(later).toBe("r1");
  });

  /* why: 同時に走る要求が混ざると、ログが別の要求の行として並ぶ */
  it("並行して走っても混ざらない", async () => {
    const one = withReqId("r1", async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));

      return currentReqId();
    });
    const two = withReqId("r2", () => Promise.resolve(currentReqId()));

    expect(await Promise.all([one, two])).toEqual(["r1", "r2"]);
  });

  it("外では - になる", () => {
    expect(currentReqId()).toBe("-");
  });

  it("抜ければ元に戻る", () => {
    withReqId("r1", () => undefined);

    expect(currentReqId()).toBe("-");
  });
});
