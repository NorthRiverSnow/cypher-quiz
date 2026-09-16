import { act, cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

import { AppRoutes } from "./routes";

afterEach(cleanup);

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

const throwOutsideRender = () =>
  act(() => {
    window.dispatchEvent(new ErrorEvent("error", { message: "壊れた" }));
  });

describe("AppRoutes", () => {
  it("描画の外で起きた例外を通知に出す", () => {
    renderAt("/");
    throwOutsideRender();

    expect(screen.getByText("予期しないエラーが起きました。壊れた")).toBeDefined();
  });

  it("閉じると通知が消える", async () => {
    renderAt("/");
    throwOutsideRender();

    await userEvent.click(screen.getByRole("button", { name: "閉じる" }));

    expect(screen.queryByText("予期しないエラーが起きました。壊れた")).toBeNull();
  });

  /* why: 通知は Routes の外に置いてある。ページの中に置くと、遷移した瞬間に消えて
     利用者が読む前に失われる */
  it("ページを移っても通知が残る", async () => {
    renderAt("/");
    throwOutsideRender();

    /* why: 章を 1 つも選んでいないと開始が押せない */
    await userEvent.click(screen.getByRole("checkbox", { name: /^全て/ }));
    await userEvent.click(screen.getByRole("button", { name: "開始" }));

    expect(screen.getByText("予期しないエラーが起きました。壊れた")).toBeDefined();
  });
});

/* why: 配布版（GitHub Pages）は api を持たない。導線を消すだけでは、URL を直に開かれると
   繋ぐ先の無い接続画面が出る（docs/04_roadmap.md#フェーズ-f--配る） */
describe("api が居ないビルド", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  /** `env.ts` は読み込みのときに 1 度だけ評価するので、積み直してから読む */
  const renderWithoutApi = async (path: string) => {
    vi.stubEnv("VITE_HAS_API", "false");
    vi.resetModules();

    const { AppRoutes } = await import("./routes");

    render(
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>,
    );
  };

  it("接続画面の URL を直に開くと、スタート画面へ送る", async () => {
    await renderWithoutApi("/connect");

    expect(screen.getByRole("button", { name: "開始" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "接続する" })).toBeNull();
  });
});
