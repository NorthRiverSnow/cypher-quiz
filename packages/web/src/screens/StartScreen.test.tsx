import { cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { useNotices } from "../controller/useNotices";
import type { SectionId } from "../types";
import { StartScreen } from "./StartScreen";

afterEach(cleanup);

const KEY = "cypher-quiz:progress";
const SECTIONS_KEY = "cypher-quiz:sections";

const Harness = () => {
  const notices = useNotices();

  return <StartScreen notices={notices} band={null} />;
};

type Stored = Readonly<{
  /** 端末に残っている進捗と成績。渡さなければ初めて開いた状態 */
  progress?: unknown;
  /** 前に選んだ章 */
  sections?: readonly SectionId[];
}>;

/** 端末の保存をこの状態にしてから、スタート画面を描く */
const renderWithStored = ({ progress, sections }: Stored = {}) => {
  window.localStorage.clear();

  if (progress !== undefined) {
    window.localStorage.setItem(KEY, JSON.stringify(progress));
  }

  if (sections !== undefined) {
    window.localStorage.setItem(SECTIONS_KEY, JSON.stringify(sections));
  }

  render(
    <MemoryRouter>
      <Harness />
    </MemoryRouter>,
  );
};

const row = (name: string) => screen.getByRole("checkbox", { name });

/* why: 消えた章はキーごと無くなる。`?? 0` で、0 で残す実装との違いを問わない */
const boxOf = (key: string): number =>
  (JSON.parse(window.localStorage.getItem(KEY) ?? "{}").boxes[key] as number | undefined) ?? 0;

/** 「読み取りの骨格」の 5 枚（docs/05_reference.md） */
const SKELETON = ["match", "optional-match", "where", "with", "return"];

const PART_WAY = {
  boxes: { "match:forward": 2 },
  answers: [{ key: "match:forward", correct: true, chosen: "" }],
};

const SKELETON_DONE = {
  boxes: Object.fromEntries(
    SKELETON.flatMap((id) => [
      [`${id}:forward`, 2],
      [`${id}:reverse`, 2],
    ]),
  ),
  answers: [],
};

describe("StartScreen", () => {
  it("章を選んでいなければ開始を押せない", () => {
    renderWithStored();

    expect(screen.getByRole("button", { name: "開始" }).getAttribute("disabled")).not.toBeNull();
  });

  it("前に選んだ章が入った状態で開く", () => {
    renderWithStored({ sections: ["skeleton"] });

    expect(row("読み取りの骨格 0 / 10").getAttribute("aria-checked")).toBe("true");
    expect(row("パターンの書き方 0 / 12").getAttribute("aria-checked")).toBe("false");
  });

  it("章を押すと選択が保存される", async () => {
    renderWithStored();

    await userEvent.click(row("読み取りの骨格 0 / 10"));

    expect(window.localStorage.getItem(SECTIONS_KEY)).toBe(JSON.stringify(["skeleton"]));
  });

  it("解きかけの章は「進行中」で、リセットが出る", () => {
    renderWithStored({ progress: PART_WAY });

    expect(row("読み取りの骨格 進行中")).toBeDefined();
    expect(screen.getByRole("button", { name: "読み取りの骨格の成績をリセット" })).toBeDefined();
  });

  it("リセットを押すとその章の記録が消える", async () => {
    renderWithStored({ progress: PART_WAY });

    await userEvent.click(screen.getByRole("button", { name: "読み取りの骨格の成績をリセット" }));

    expect(row("読み取りの骨格 0 / 10")).toBeDefined();
    expect(screen.queryByRole("button", { name: "読み取りの骨格の成績をリセット" })).toBeNull();
  });

  /* why: 完了していた章は最初から出し直す（docs/01_spec.md#スタート画面--出す章を選ぶ） */
  it("開始で、選んだ完了済みの章の記録が消える", async () => {
    renderWithStored({ progress: SKELETON_DONE, sections: ["skeleton"] });

    await userEvent.click(screen.getByRole("button", { name: "開始" }));

    expect(boxOf("match:forward")).toBe(0);
  });

  /* why: 選ばなかった章の成績は変更されない（docs/01_spec.md#スタート画面--出す章を選ぶ） */
  it("開始しても、選ばなかった完了済みの章は消えない", async () => {
    renderWithStored({ progress: SKELETON_DONE, sections: ["patterns"] });

    await userEvent.click(screen.getByRole("button", { name: "開始" }));

    expect(boxOf("match:forward")).toBe(2);
  });
});
