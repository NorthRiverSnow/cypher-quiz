import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { useTheme } from "./useTheme";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("useTheme", () => {
  it("選ぶまでは data-theme を書かない", () => {
    renderHook(() => useTheme());

    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("切り替えると data-theme を書き、次回のために残す", () => {
    const { result } = renderHook(() => useTheme());
    const before = result.current[0];

    act(() => result.current[1]());

    const after = before === "light" ? "dark" : "light";
    expect(document.documentElement.dataset.theme).toBe(after);
    expect(window.localStorage.getItem("cypher-quiz:theme")).toBe(after);
  });

  it("前回の選択を初期値にする", () => {
    window.localStorage.setItem("cypher-quiz:theme", "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current[0]).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  /* why: 壊れた値で dark 扱いにしない。手で書き換えられる場所なので */
  it("知らない値は無視して OS 設定に戻す", () => {
    window.localStorage.setItem("cypher-quiz:theme", "sepia");

    renderHook(() => useTheme());

    expect(document.documentElement.dataset.theme).toBeUndefined();
  });
});
