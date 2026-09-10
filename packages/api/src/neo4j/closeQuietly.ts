import { attemptAsync } from "@cypher-quiz/shared";

import type { Logger } from "../log";
import { detailOf } from "./toApiError";

/**
 * 閉じる。閉じられなくても throw せず、warn に残して続ける。
 *
 * why: 閉じる失敗を呼ぶ側に返してもできることが無い。結果は既に手元にあり、対象は手放している
 *
 * @param name ログに出す名前
 */
export const closeQuietly = async (
  log: Logger,
  name: string,
  target: { close: () => Promise<void> },
): Promise<void> => {
  const closed = await attemptAsync(() => target.close(), detailOf);

  if (!closed.ok) {
    log({ event: "error", name, message: closed.error }, "warn");
  }
};
