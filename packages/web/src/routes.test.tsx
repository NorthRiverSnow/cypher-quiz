import { act, cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "storybook/test";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vite-plus/test";

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
