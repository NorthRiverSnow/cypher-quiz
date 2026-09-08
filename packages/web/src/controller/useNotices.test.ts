import { err, ok } from "@cypher-quiz/shared";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { type NoticeBody, useNotices } from "./useNotices";

afterEach(cleanup);

const SAVE_FAILED = (): NoticeBody => ({ tone: "warn", title: "進捗を保存できません" });

const RUN_FAILED = (message: string): NoticeBody => ({
  tone: "alarm",
  title: "クエリを実行できません",
  detail: message,
});

describe("useNotices", () => {
  it("最初は何も無い", () => {
    const { result } = renderHook(() => useNotices());

    expect(result.current.items).toEqual([]);
  });

  it("err を積む", () => {
    const { result } = renderHook(() => useNotices());

    act(() => void result.current.report("run", err("構文エラー"), RUN_FAILED));

    expect(result.current.items).toEqual([
      { kind: "run", tone: "alarm", title: "クエリを実行できません", detail: "構文エラー" },
    ]);
  });

  it("ok では積まない", () => {
    const { result } = renderHook(() => useNotices());

    act(() => void result.current.report("run", ok(1), RUN_FAILED));

    expect(result.current.items).toEqual([]);
  });

  /* why: 進捗保存は毎問走る。同じ種類が積み上がると画面が通知で埋まる */
  it("同じ種類は 1 件のまま入れ替わる", () => {
    const { result } = renderHook(() => useNotices());

    act(() => void result.current.report("run", err("1 回目"), RUN_FAILED));
    act(() => void result.current.report("run", err("2 回目"), RUN_FAILED));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.detail).toBe("2 回目");
  });

  it("次に成功したら取り下げる", () => {
    const { result } = renderHook(() => useNotices());

    act(() => void result.current.report("progress-save", err("だめ"), SAVE_FAILED));
    expect(result.current.items).toHaveLength(1);

    act(() => void result.current.report("progress-save", ok(undefined), SAVE_FAILED));

    expect(result.current.items).toEqual([]);
  });

  /* why: 別の失敗を巻き込んで消さない。保存の成功でクエリの失敗が消えたら嘘になる */
  it("取り下げるのは同じ種類だけ", () => {
    const { result } = renderHook(() => useNotices());

    act(() => void result.current.report("run", err("構文エラー"), RUN_FAILED));
    act(() => void result.current.report("progress-save", err("だめ"), SAVE_FAILED));
    act(() => void result.current.report("progress-save", ok(undefined), SAVE_FAILED));

    expect(result.current.items.map((notice) => notice.kind)).toEqual(["run"]);
  });

  it("dismiss で消える", () => {
    const { result } = renderHook(() => useNotices());

    act(() => void result.current.report("run", err("構文エラー"), RUN_FAILED));
    act(() => result.current.dismiss("run"));

    expect(result.current.items).toEqual([]);
  });

  /* why: 閉じた通知だけを消す。1 つ閉じて他も消えると、残っている失敗が見えなくなる */
  it("dismiss は同じ種類だけ消す", () => {
    const { result } = renderHook(() => useNotices());

    act(() => void result.current.report("run", err("構文エラー"), RUN_FAILED));
    act(() => void result.current.report("progress-save", err("だめ"), SAVE_FAILED));
    act(() => result.current.dismiss("run"));

    expect(result.current.items.map((notice) => notice.kind)).toEqual(["progress-save"]);
  });

  /* why: 呼ぶ側が続けて値を使えるように、受け取った Result をそのまま返す */
  it("report は Result をそのまま返す", () => {
    const { result } = renderHook(() => useNotices());
    const failure = err("構文エラー");
    const success = ok(42);

    let returnedFailure: unknown;
    let returnedSuccess: unknown;
    act(() => {
      returnedFailure = result.current.report("run", failure, RUN_FAILED);
      returnedSuccess = result.current.report("connect", success, RUN_FAILED);
    });

    expect(returnedFailure).toBe(failure);
    expect(returnedSuccess).toBe(success);
  });
});
