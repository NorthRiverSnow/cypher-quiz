import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { useNotices } from "../controller/useNotices";
import { StartScreen } from "./StartScreen";

afterEach(cleanup);

const KEY = "cypher-quiz:progress";

const Harness = () => {
  const notices = useNotices();

  return <StartScreen notices={notices} band={null} />;
};

const show = (saved?: unknown) => {
  window.localStorage.clear();

  if (saved !== undefined) {
    window.localStorage.setItem(KEY, JSON.stringify(saved));
  }

  render(
    <MemoryRouter>
      <Harness />
    </MemoryRouter>,
  );
};

describe("StartScreen", () => {
  it("保存が無ければ「クイズスタート！」", () => {
    show();

    expect(screen.getByRole("button", { name: "クイズスタート！" })).toBeDefined();
  });

  /* why: 全て box 0 は「まだ何もしていない」と同じ。残り 60 問と出しても情報を持たない */
  it("全て box 0 なら続きとして出さない", () => {
    show({ boxes: { "match:forward": 0, "match:reverse": 0 }, answers: [] });

    expect(screen.getByRole("button", { name: "クイズスタート！" })).toBeDefined();
  });

  it("進捗があれば残り問題数を出す", () => {
    show({ boxes: { "match:forward": 2, "match:reverse": 1 }, answers: [] });

    expect(screen.getByRole("button", { name: "続きから（残り 59 問）" })).toBeDefined();
  });

  it("全て完了していれば残り 0 問", () => {
    const boxes = Object.fromEntries(
      ["match", "where"].flatMap((id) => [
        [`${id}:forward`, 2],
        [`${id}:reverse`, 2],
      ]),
    );
    show({ boxes, answers: [] });

    expect(screen.getByRole("button", { name: "続きから（残り 56 問）" })).toBeDefined();
  });
});
