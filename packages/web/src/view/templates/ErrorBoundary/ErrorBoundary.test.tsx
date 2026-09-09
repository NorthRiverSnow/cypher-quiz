import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import { ErrorBoundary } from "./ErrorBoundary";

afterEach(cleanup);

/* why: React は境界で捕まえた例外もコンソールに出す。テストの出力を汚さないために黙らせる */
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

const Boom = (): never => {
  throw new Error("描けません");
};

describe("ErrorBoundary", () => {
  it("例外が無ければ中身を描く", () => {
    render(
      <ErrorBoundary fallback={() => <p>代わりの画面</p>}>
        <p>本来の画面</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText("本来の画面")).toBeDefined();
    expect(screen.queryByText("代わりの画面")).toBeNull();
  });

  /* why: 境界が無いと React は木ごと外して白い画面になる */
  it("描画中の例外で fallback に切り替える", () => {
    render(
      <ErrorBoundary fallback={(error) => <p>代わりの画面: {error.message}</p>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByText("代わりの画面: 描けません")).toBeDefined();
  });

  it("例外をコンソールに残す", () => {
    render(
      <ErrorBoundary fallback={() => <p>代わりの画面</p>}>
        <Boom />
      </ErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalled();
  });
});
