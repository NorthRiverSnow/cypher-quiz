import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { AppRoutes } from "../routes";
import { SECTION_LABELS } from "../types";

afterEach(cleanup);

const KEY = "cypher-quiz:progress";
const SECTIONS_KEY = "cypher-quiz:sections";

beforeEach(() => {
  window.localStorage.clear();
  /* why: 章を選ばないと出題が 0 問になる。章の選択そのものは useStart のテストで見る */
  window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(Object.keys(SECTION_LABELS)));
});

/** 1 枚だけのデッキ。完了まで 2 方向 × 2 回 = 4 回で着く */
const ONE = [
  {
    id: "match",
    section: "skeleton",
    name: "MATCH",
    role: "形に当てはまる組み合わせを探す",
    mutates: false,
  },
] as const;

/* why: このシードだと 1 番目の肢が不正解になる。正解を選んでしまうと、
   「選んだ肢を出す」と「正解を出す」を区別できない */
const SEED = 1;

const open = (path: string, quiz: { seed?: number; deck?: typeof ONE } = { seed: SEED }) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes quiz={quiz} />
    </MemoryRouter>,
  );

const saved = () => JSON.parse(window.localStorage.getItem(KEY) ?? "null") as unknown;

/** 表に出ている 4 択から、正解でない肢を選んで決定する */
const answerWrong = async () => {
  const choices = screen.getAllByRole("radio");
  await userEvent.click(choices[0] ?? choices[0]!);
  await userEvent.click(screen.getByRole("button", { name: "決定" }));
};

describe("スタート", () => {
  it("押すと接続画面へ進む", async () => {
    open("/");

    await userEvent.click(screen.getByRole("button", { name: "開始" }));

    expect(screen.getByRole("heading", { name: /接続/ })).toBeDefined();
  });
});

describe("出題", () => {
  /* why: 結果へ送ると 0 問のサマリが出る（docs/01_spec.md#スタート画面--出す章を選ぶ） */
  it("章を選んでいなければスタートへ返す", () => {
    window.localStorage.removeItem(SECTIONS_KEY);
    open("/quiz");

    expect(screen.getByRole("button", { name: "開始" })).toBeDefined();
  });

  it("4 択が出る", () => {
    open("/quiz");

    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  it("決定すると裏になり、答えを保存する", async () => {
    open("/quiz");

    await answerWrong();

    expect(screen.getByRole("button", { name: "次の問題" })).toBeDefined();
    expect(saved()).toMatchObject({ answers: [{ correct: expect.any(Boolean) }] });
  });

  /* why: 裏に出すのは「選んだ肢」であって、正解ではない */
  it("裏に選んだ肢をそのまま出す", async () => {
    open("/quiz");

    /* why: 肢の DOM は「番号 + 本文」。番号を外さないと一致しない */
    const chosen = (screen.getAllByRole("radio")[0]?.textContent ?? "").replace(/^\d+/, "");

    await answerWrong();

    expect(screen.getByRole("img", { name: "不正解" })).toBeDefined();
    expect(screen.getAllByText(chosen).length).toBeGreaterThan(0);
  });

  /* why: 出題が尽きたら結果へ送る。空の画面を出さない */
  it("全て完了していたら結果画面になる", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ boxes: { "match:forward": 2, "match:reverse": 2 }, answers: [] }),
    );
    open("/quiz", { seed: SEED, deck: ONE });

    expect(screen.getByRole("button", { name: "もう一度" })).toBeDefined();
    expect(screen.queryAllByRole("radio")).toEqual([]);
  });

  /* why: 進捗バーは出題以降の画面で常に出る（docs/01_spec.md#7-画面と導線） */
  it("進捗バーが出る", () => {
    open("/quiz");

    expect(screen.getByRole("progressbar", { name: "進捗" })).toBeDefined();
  });
});

describe("結果", () => {
  const ALL_DONE = {
    boxes: { "match:forward": 2, "match:reverse": 2 },
    answers: [
      { key: "match:forward", correct: false, chosen: "違う肢" },
      { key: "match:forward", correct: true, chosen: "MATCH の役目" },
    ],
  };

  /* why: 1 度でも間違えた問題は、そのあと正解しても不正解として数える */
  it("保存された成績を出す", () => {
    window.localStorage.setItem(KEY, JSON.stringify(ALL_DONE));
    open("/result");

    expect(screen.getByText(/1 問中 0 問/)).toBeDefined();
    expect(screen.getByRole("button", { name: /MATCH/ })).toBeDefined();
  });

  it("もう一度で保存を消して出題へ戻る", async () => {
    window.localStorage.setItem(KEY, JSON.stringify(ALL_DONE));
    open("/result");

    await userEvent.click(screen.getByRole("button", { name: "もう一度" }));

    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
  });

  /* why: 間違えた問題の box を 0 に戻して遷移する。次の画面はそれを読んで組み直す */
  it("不正解だけもう一度で box が 0 に戻る", async () => {
    window.localStorage.setItem(KEY, JSON.stringify(ALL_DONE));
    open("/result");

    await userEvent.click(screen.getByRole("button", { name: "不正解だけもう一度" }));

    expect(saved()).toMatchObject({
      boxes: { "match:forward": 0, "match:reverse": 2 },
      answers: [],
    });
  });

  it("不正解の行を押すと復習画面へ進む", async () => {
    window.localStorage.setItem(KEY, JSON.stringify(ALL_DONE));
    open("/result");

    await userEvent.click(screen.getByRole("button", { name: /MATCH/ }));

    expect(screen.getByText("問題")).toBeDefined();
    expect(screen.getByRole("button", { name: "結果に戻る" })).toBeDefined();
  });
});

describe("復習", () => {
  const MISSED = {
    boxes: {},
    answers: [{ key: "match:forward", correct: false, chosen: "違う肢" }],
  };

  it("選んだ肢をそのまま出す", () => {
    window.localStorage.setItem(KEY, JSON.stringify(MISSED));
    open("/review/match/forward");

    expect(screen.getByText("違う肢")).toBeDefined();
    expect(screen.getByRole("img", { name: "不正解" })).toBeDefined();
  });

  /* why: 解き直しではないので、残り枚数は判断に使えない */
  it("進捗バーを出さない", () => {
    window.localStorage.setItem(KEY, JSON.stringify(MISSED));
    open("/review/match/forward");

    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("戻ると結果画面になる", async () => {
    window.localStorage.setItem(KEY, JSON.stringify(MISSED));
    open("/review/match/forward");

    await userEvent.click(screen.getByRole("button", { name: "結果に戻る" }));

    expect(screen.getByRole("button", { name: "もう一度" })).toBeDefined();
  });

  /* why: URL は手で書ける。開けないものは結果へ送り返す */
  it.each(["/review/nosuch/forward", "/review/match/sideways", "/review/match/reverse"])(
    "%s は結果画面へ送り返す",
    (path) => {
      window.localStorage.setItem(KEY, JSON.stringify(MISSED));
      open(path);

      expect(screen.getByRole("button", { name: "もう一度" })).toBeDefined();
    },
  );
});

describe("知らない URL", () => {
  it("スタートへ送る", () => {
    open("/nosuch");

    expect(screen.getByRole("button", { name: "開始" })).toBeDefined();
  });
});
