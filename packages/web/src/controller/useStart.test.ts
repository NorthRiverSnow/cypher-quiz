import { ok } from "@cypher-quiz/shared";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { Card } from "../model/deck";
import type { Box } from "../model/leitner";
import type { Saved } from "../model/quiz";
import { keyOf } from "../model/quiz.common";
import type { SectionId } from "../types";
import type { Progress } from "./useProgress";
import { useStart } from "./useStart";

afterEach(cleanup);

const card = (id: string, section: SectionId): Card => ({
  id,
  section,
  name: `${id} の構文`,
  role: `${id} の役目`,
  mutates: false,
});

/** skeleton は a / b（4 問）、lists は c（2 問） */
const DECK: readonly Card[] = [card("a", "skeleton"), card("b", "skeleton"), card("c", "lists")];

const done = (ids: readonly string[]): Record<string, Box> =>
  Object.fromEntries(
    ids.flatMap((id) => [
      [keyOf(id, "forward"), 2 as Box],
      [keyOf(id, "reverse"), 2 as Box],
    ]),
  );

const setup = (saved: Saved = { boxes: {}, answers: [] }, sections: readonly SectionId[] = []) => {
  const written: Saved[] = [];
  const chosen: (readonly SectionId[])[] = [];

  const progress: Progress = {
    load: () => saved,
    save: (next) => {
      written.push(next);

      return ok(undefined);
    },
    loadSections: () => sections,
    saveSections: (next) => {
      chosen.push(next);

      return ok(undefined);
    },
  };

  return {
    ...renderHook(() => useStart(progress, DECK)),
    written: () => written,
    chosen: () => chosen,
  };
};

const row = (result: { current: ReturnType<typeof useStart> }, id: SectionId) =>
  result.current.sections.find((section) => section.id === id);

describe("章の行", () => {
  it("デッキの章を並べる", () => {
    const { result } = setup();

    expect(result.current.sections.map(({ id }) => id)).toEqual(["skeleton", "lists"]);
  });

  it("未着手は 0 / 全問", () => {
    const { result } = setup();

    expect(row(result, "skeleton")?.status).toBe("0 / 4");
  });

  it("完了は 正解 / 全問", () => {
    const answers = [
      { key: keyOf("a", "forward"), correct: true, chosen: "肢" },
      { key: keyOf("a", "reverse"), correct: false, chosen: "肢" },
    ];
    const { result } = setup({ boxes: done(["a", "b"]), answers });

    expect(row(result, "skeleton")?.status).toBe("1 / 4");
  });

  /* why: 途中の数は成績ではない。他の章の `8 / 10` と並べると比べられてしまう */
  it("解きかけは数を出さずに 進行中", () => {
    const answers = [{ key: keyOf("a", "forward"), correct: true, chosen: "肢" }];
    const { result } = setup({ boxes: {}, answers });

    expect(row(result, "skeleton")?.status).toBe("進行中");
  });

  it("「全て」の行に総ざらいの問題数を出す", () => {
    const { result } = setup();

    expect(result.current.allStatus).toBe("6 問・最初から");
  });
});

describe("選ぶ", () => {
  it("保存された選択から始まる", () => {
    const { result } = setup(undefined, ["lists"]);

    expect(row(result, "lists")?.checked).toBe(true);
    expect(row(result, "skeleton")?.checked).toBe(false);
  });

  it("押すと入り、もう一度押すと外れる", () => {
    const { result } = setup();

    act(() => result.current.toggle("lists"));
    expect(row(result, "lists")?.checked).toBe(true);

    act(() => result.current.toggle("lists"));
    expect(row(result, "lists")?.checked).toBe(false);
  });

  it("選ぶたびに端末へ残す", () => {
    const { result, chosen } = setup();

    act(() => result.current.toggle("lists"));

    expect(chosen()).toEqual([["lists"]]);
  });

  it("「全て」で全章が入る", () => {
    const { result } = setup();

    act(() => result.current.toggleAll());

    expect(result.current.sections.every(({ checked }) => checked)).toBe(true);
  });

  it("全章が入っているときの「全て」は全部外す", () => {
    const { result } = setup(undefined, ["skeleton", "lists"]);

    act(() => result.current.toggleAll());

    expect(result.current.sections.some(({ checked }) => checked)).toBe(false);
  });

  it("1 つも選んでいなければ始められない", () => {
    const { result } = setup();

    expect(result.current.canStart).toBe(false);

    act(() => result.current.toggle("lists"));

    expect(result.current.canStart).toBe(true);
  });
});

describe("始める", () => {
  it("完了した章は捨ててから始める", () => {
    const answers = [{ key: keyOf("a", "forward"), correct: true, chosen: "肢" }];
    const { result, written } = setup({ boxes: done(["a", "b"]), answers }, ["skeleton"]);

    act(() => result.current.start());

    expect(written()[0]).toEqual({ boxes: {}, answers: [] });
  });

  it("解きかけの章はそのまま続ける", () => {
    const saved = { boxes: { [keyOf("c", "forward")]: 1 as Box }, answers: [] };
    const { result, written } = setup(saved, ["lists"]);

    act(() => result.current.start());

    expect(written()[0]).toEqual(saved);
  });

  /* why: 全章を選んだら総ざらい。完了しているかを見ずに全部捨てる */
  it("全章を選ぶと、完了していなくても全部捨てる", () => {
    const saved = { boxes: { [keyOf("c", "forward")]: 1 as Box }, answers: [] };
    const { result, written } = setup(saved, ["skeleton", "lists"]);

    act(() => result.current.start());

    expect(written()[0]).toEqual({ boxes: {}, answers: [] });
  });
});
