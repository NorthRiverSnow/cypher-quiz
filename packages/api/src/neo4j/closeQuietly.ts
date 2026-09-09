import { attemptAsync } from "@cypher-quiz/shared";

import type { Logger } from "../log";
import { detailOf } from "./toApiError";

/**
 * 閉じる。閉じられなくても throw せず、warn に残して続ける。
 *
 * why: 閉じ忘れると接続が残り、やがて枯れる。一方で閉じる失敗を呼ぶ側に返しても、
 * できることが無い——結果は既に手元にあり、対象はもう手放している
 *
 * @param name ログに出す名前。何を閉じられなかったかを残す
 */
export const closeQuietly = async (
  log: Logger,
  reqId: string,
  name: string,
  target: { close: () => Promise<void> },
): Promise<void> => {
  const closed = await attemptAsync(() => target.close(), detailOf);

  if (!closed.ok) {
    log({ event: "error", reqId, name, message: closed.error }, "warn");
  }
};
