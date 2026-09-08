import { type Result } from "@cypher-quiz/shared";
import { useCallback, useState } from "react";

import type { NoticeTone } from "../view/molecules/Notice/Notice";

/** 失敗の出どころ。種類ごとに 1 件だけ持つ */
export type NoticeKind = "progress-save" | "connect" | "run" | "unexpected";

export type Notice = Readonly<{
  kind: NoticeKind;
  tone: NoticeTone;
  title: string;
  detail?: string;
}>;

export type NoticeBody = Omit<Notice, "kind">;

export type Notices = Readonly<{
  items: readonly Notice[];
  dismiss: (kind: NoticeKind) => void;
  /**
   * err なら通知に積み、ok ならその種類の通知を取り下げる。
   *
   * why: 受け取った Result をそのまま返す。呼ぶ側が値を使っても捨てても、失敗は画面に出る
   */
  report: <T, E>(
    kind: NoticeKind,
    result: Result<T, E>,
    describe: (error: E) => NoticeBody,
  ) => Result<T, E>;
}>;

export const useNotices = (): Notices => {
  const [items, setItems] = useState<readonly Notice[]>([]);

  const dismiss = useCallback((kind: NoticeKind) => {
    setItems((prev) => prev.filter((notice) => notice.kind !== kind));
  }, []);

  const report = useCallback(
    <T, E>(
      kind: NoticeKind,
      result: Result<T, E>,
      describe: (error: E) => NoticeBody,
    ): Result<T, E> => {
      setItems((prev) => {
        const others = prev.filter((notice) => notice.kind !== kind);

        return result.ok ? others : [...others, { kind, ...describe(result.error) }];
      });

      return result;
    },
    [],
  );

  return { items, dismiss, report };
};
