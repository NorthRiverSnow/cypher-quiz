import { ok } from "@cypher-quiz/shared";
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import type { Card } from "../model/deck";
import type { Saved } from "../model/quiz";
import type { Progress } from "./useProgress";
import { useReview } from "./useReview";

afterEach(cleanup);

const MATCH: Card = {
  id: "match",
  section: "skeleton",
  name: "MATCH",
  role: "形に当てはまる組み合わせを探す",
  code: [{ text: "MATCH (n) RETURN n" }],
  expected: "73 行",
  note: "SQL の FROM + JOIN",
  mutates: false,
};

const CREATE: Card = {
  id: "create",
  section: "writing",
  name: "CREATE",
  role: "ノードを作る",
  warn: "共有の DB を壊さない",
  mutates: true,
};

const DECK: readonly Card[] = [MATCH, CREATE];

const ANSWERS: Saved["answers"] = [
  { key: "match:forward", correct: false, chosen: "1 回目に選んだ肢" },
  { key: "match:forward", correct: false, chosen: "2 回目に選んだ肢" },
  { key: "match:reverse", correct: false, chosen: "逆順で選んだ肢" },
  { key: "create:forward", correct: false, chosen: "書き込みで選んだ肢" },
];

const setup = (cardId: string, direction: string, answers = ANSWERS) => {
  const progress: Progress = {
    load: () => ({ boxes: {}, answers }),
    save: () => ok(undefined),
    loadSections: () => [],
    saveSections: () => ok(undefined),
    clear: () => undefined,
  };

  return renderHook(() => useReview(cardId, direction, progress, DECK));
};

describe("設問と答え", () => {
  it("正順は構文を出して目的を答えにする", () => {
    const { result } = setup("match", "forward");

    expect(result.current).toMatchObject({
      section: "skeleton",
      direction: "forward",
      prompt: "MATCH",
      correct: "形に当てはまる組み合わせを探す",
    });
  });

  it("逆順は目的を出して構文を答えにする", () => {
    const { result } = setup("match", "reverse");

    expect(result.current).toMatchObject({
      prompt: "形に当てはまる組み合わせを探す",
      correct: "MATCH",
    });
  });

  /* why: 同じ問題に何度も答える。開き直すのは最後に選んだもの */
  it("最後に選んだ肢を返す", () => {
    const { result } = setup("match", "forward");

    expect(result.current?.chosen).toBe("2 回目に選んだ肢");
  });

  it("向きごとに別の肢を返す", () => {
    expect(setup("match", "reverse").result.current?.chosen).toBe("逆順で選んだ肢");
  });

  it("解説と期待される実行結果を渡す", () => {
    const { result } = setup("match", "forward");

    expect(result.current).toMatchObject({
      code: MATCH.code,
      expected: "73 行",
      note: "SQL の FROM + JOIN",
    });
  });

  it("持っていない項目は渡さない", () => {
    const { result } = setup("match", "forward");

    expect(result.current).not.toHaveProperty("warn");
  });
});

describe("編集欄を出してよいか", () => {
  it("読み取りのカードは出す", () => {
    expect(setup("match", "forward").result.current?.editable).toBe(true);
  });

  /* why: 止めるのは書き込みだけ。構文の列挙もそのままでは通らないが、書き換えて試せる
     （docs/01_spec.md#4-クエリの実行と編集） */
  it("書き込みのカードは出さない", () => {
    const { result } = setup("create", "forward");

    expect(result.current).toMatchObject({ editable: false, warn: "共有の DB を壊さない" });
  });

  /* why: 一覧は 1 本のクエリにならない。画面が書き換えを促せるよう伝える */
  it("一覧のカードは印を渡す", () => {
    const listing: Card = { ...MATCH, id: "list", mutates: false, listing: true };
    const progress: Progress = {
      load: () => ({ boxes: {}, answers: [{ key: "list:forward", correct: false, chosen: "あ" }] }),
      save: () => ok(undefined),
      loadSections: () => [],
      saveSections: () => ok(undefined),
      clear: () => undefined,
    };
    const { result } = renderHook(() => useReview("list", "forward", progress, [listing]));

    expect(result.current).toMatchObject({ editable: true, listing: true });
  });

  it("一覧でないカードは false", () => {
    expect(setup("match", "forward").result.current?.listing).toBe(false);
  });

  /* why: そのままでは通らないカードでも出す。書き換えて試せることのほうが要る */
  it("そのまま通らないカードでも出す", () => {
    const listing: Card = { ...MATCH, id: "listing", mutates: false };
    const progress: Progress = {
      load: () => ({
        boxes: {},
        answers: [{ key: "listing:forward", correct: false, chosen: "あ" }],
      }),
      save: () => ok(undefined),
      loadSections: () => [],
      saveSections: () => ok(undefined),
      clear: () => undefined,
    };
    const { result } = renderHook(() => useReview("listing", "forward", progress, [listing]));

    expect(result.current?.editable).toBe(true);
  });
});

describe("開けないとき", () => {
  /* why: URL は手で書ける。知らない値で画面を組ませない */
  it.each([
    ["知らないカード", "nosuch", "forward"],
    ["向きが違う", "match", "sideways"],
    ["向きが空", "match", ""],
  ])("%s なら undefined", (_, cardId, direction) => {
    expect(setup(cardId, direction).result.current).toBeUndefined();
  });

  /* why: 答えた記録が無ければ「選んだ肢」を出せない */
  it("答えていない問題なら undefined", () => {
    expect(setup("create", "reverse").result.current).toBeUndefined();
  });

  it("保存が空なら undefined", () => {
    expect(setup("match", "forward", []).result.current).toBeUndefined();
  });
});
