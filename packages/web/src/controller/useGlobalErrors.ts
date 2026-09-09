import { err } from "@cypher-quiz/shared";
import { useEffect } from "react";

import type { NoticeBody, Notices } from "./useNotices";

const messageOf = (value: unknown): string =>
  value instanceof Error ? value.message : String(value);

const UNEXPECTED = (detail: string): NoticeBody => ({
  tone: "alarm",
  title: "予期しないエラーが起きました",
  detail,
});

/**
 * ErrorBoundary が拾えない例外を通知に積む。
 *
 * why: 境界は描画中の例外だけを捕まえる。fetch の失敗や await の外で reject した Promise は
 * 通り抜けて、コンソールにしか残らない
 */
export const useGlobalErrors = (notices: Notices): void => {
  const { report } = notices;

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      report("unexpected", err(messageOf(event.error ?? event.message)), UNEXPECTED);
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      report("unexpected", err(messageOf(event.reason)), UNEXPECTED);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [report]);
};
