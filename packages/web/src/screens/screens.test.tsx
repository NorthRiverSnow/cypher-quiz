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

/** 2 章 × 1 枚。章をまたぐ検証に使う。1 章あたり 2 問（2 方向） */
const TWO_SECTIONS = [
  ONE[0],
  {
    id: "return",
    section: "shaping",
    name: "RETURN",
    role: "出す列を決める",
    mutates: false,
  },
] as const;

/* why: このシードだと 1 番目の肢が不正解になる。正解を選んでしまうと、
   「選んだ肢を出す」と「正解を出す」を区別できない */
const SEED = 1;

const open = (
  path: string,
  quiz: { seed?: number; deck?: typeof ONE | typeof TWO_SECTIONS } = { seed: SEED },
) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes quiz={quiz} />
    </MemoryRouter>,
  );

const saved = () => JSON.parse(window.localStorage.getItem(KEY) ?? "null") as unknown;

/** 「読み取りの骨格」の 5 枚（docs/05_reference.md） */
const SKELETON_IDS = ["match", "optional-match", "where", "with", "return"];

/** 渡したカードの 2 方向を box 2 で埋める */
const doneBoxes = (ids: readonly string[]) =>
  Object.fromEntries(
    ids.flatMap((id) => [
      [`${id}:forward`, 2],
      [`${id}:reverse`, 2],
    ]),
  );

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
  it("章を 1 つも選ばずに出題の URL を開くと、スタート画面へ返す", () => {
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

  /* why: 消すのは章を選んで開始したとき（docs/01_spec.md#スタート画面--出す章を選ぶ） */
  it("「もう一度」を押すとスタート画面へ戻り、保存された成績は消えない", async () => {
    window.localStorage.setItem(KEY, JSON.stringify(ALL_DONE));
    open("/result");

    await userEvent.click(screen.getByRole("button", { name: "もう一度" }));

    expect(screen.getByRole("button", { name: "開始" })).toBeDefined();
    expect(saved()).toMatchObject(ALL_DONE);
  });

  /* why: 間違えた問題の box を 0 に戻して遷移する。次の画面はそれを読んで組み直す */
  it("「不正解だけもう一度」を押すと、間違えた問題の box だけが 0 に戻る", async () => {
    window.localStorage.setItem(KEY, JSON.stringify(ALL_DONE));
    open("/result");

    await userEvent.click(screen.getByRole("button", { name: "不正解だけもう一度" }));

    expect(saved()).toMatchObject({
      boxes: { "match:forward": 0, "match:reverse": 2 },
      /* why: 回答は 1 つも捨てない。捨てると、スタート画面の章の成績が
         解き直したぶんだけになる */
      answers: ALL_DONE.answers,
    });
  });

  /* why: ボタンから出題までを通す。box を戻すのと回答を残すのは別のテストで見ているが、
     その 2 つを繋いだ結果、出題が間違えた 1 問だけになるかは、ここでしか分からない */
  it("「不正解だけもう一度」を押すと、間違えた問題だけが出題される", async () => {
    window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(["skeleton"]));
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        boxes: doneBoxes(SKELETON_IDS),
        answers: [
          { key: "match:forward", correct: false, chosen: "違う肢" },
          { key: "match:forward", correct: true, chosen: "MATCH の役目" },
        ],
      }),
    );
    open("/result");

    await userEvent.click(screen.getByRole("button", { name: "不正解だけもう一度" }));

    expect(screen.getAllByRole("radio")).toHaveLength(4);
    /* why: 章は 10 問あるので、残らず出ていれば「あと 20 回」になる。
       2 回なら、box 0 に戻ったのは間違えた 1 問だけ */
    expect(screen.getByRole("progressbar").getAttribute("aria-valuetext")).toContain("あと 2 回");
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

describe("章を選んで解く", () => {
  /** 章ごとの問題数（枚数 × 2 方向。docs/05_reference.md） */
  const SKELETON = 10;
  const SHAPING = 8;
  const ALL = 60;

  /** 完了に要る正解は 1 問 2 回 */
  const toComplete = (questions: number) => questions * 2;

  /**
   * スタート画面で章を選び、接続を飛ばして出題まで進む。
   *
   * why: 選択を消してから開く。初めて開いたときは何も選ばれていない
   * （docs/01_spec.md#スタート画面--出す章を選ぶ）
   */
  const startWith = async (...labels: string[]) => {
    window.localStorage.removeItem(SECTIONS_KEY);
    open("/", {});

    for (const label of labels) {
      await userEvent.click(screen.getByRole("checkbox", { name: new RegExp(`^${label}`) }));
    }

    await userEvent.click(screen.getByRole("button", { name: "開始" }));
    await userEvent.click(screen.getByRole("button", { name: "接続せずに始める" }));
  };

  /** 進捗バーが読み上げる「あと N 回」 */
  const left = (): number =>
    Number(
      /あと (\d+) 回/.exec(
        screen.getByRole("progressbar").getAttribute("aria-valuetext") ?? "",
      )?.[1],
    );

  /** 出題中のカードの章。`§ ` が前に付く（`atoms/SectionLabel`） */
  const shownSection = () => screen.getByText(/^§ /).textContent;

  it("選んだ章の問題だけが出題され、進捗バーの残りもその章の分だけになる", async () => {
    await startWith("読み取りの骨格");

    expect(shownSection()).toBe("§ 読み取りの骨格");
    expect(left()).toBe(toComplete(SKELETON));
  });

  /* why: 進み具合をばらけさせて始める。空から始めると、消さない実装でも同じ数になる */
  it("「全て」を選ぶと、章ごとの進み具合に関わらず 60 問が最初から出題される", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        boxes: { ...doneBoxes(SKELETON_IDS), "orderby:forward": 1 },
        answers: [{ key: "match:forward", correct: true, chosen: "あ" }],
      }),
    );

    await startWith("全て");

    expect(left()).toBe(toComplete(ALL));
  });

  /* why: 完了した章を選び直すと、間違いの有無に関わらず全問を最初から出す */
  it("完了した章をもう一度選ぶと、その章の全問が最初から出題される", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        boxes: doneBoxes(SKELETON_IDS),
        answers: [{ key: "match:forward", correct: false, chosen: "あ" }],
      }),
    );

    await startWith("読み取りの骨格");

    expect(left()).toBe(toComplete(SKELETON));
  });

  /** 「読み取りの骨格」を途中まで解いた保存 */
  const PART_WAY = {
    boxes: { "match:forward": 1 },
    answers: [{ key: "match:forward", correct: true, chosen: "あ" }],
  };

  /* why: 前回どの章で終えたかは出題に影響しない（docs/01_spec.md#選んだ章に限るもの） */
  it.each([
    ["解きかけの問題があっても", PART_WAY],
    ["解きかけの問題が無くても", { boxes: {}, answers: [] }],
  ])("%s、章選択で選ばなかった章は出題されない", async (_situation, stored) => {
    window.localStorage.setItem(KEY, JSON.stringify(stored));

    await startWith("結果の整形");

    expect(shownSection()).toBe("§ 結果の整形");
    expect(left()).toBe(toComplete(SHAPING));
  });
});

describe("知らない URL", () => {
  it("スタートへ送る", () => {
    open("/nosuch");

    expect(screen.getByRole("button", { name: "開始" })).toBeDefined();
  });
});
