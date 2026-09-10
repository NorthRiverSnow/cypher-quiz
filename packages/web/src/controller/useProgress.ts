import type { Result } from "@cypher-quiz/shared";

import { type Saved, type Store, clear, load, save } from "../model/progress";
import type { Notices } from "./useNotices";

export type Progress = Readonly<{
  load: () => Saved;
  save: (saved: Saved) => Result<void, "store-unavailable">;
  /** 最初から解き直すときに消す */
  clear: () => void;
}>;

/**
 * 進捗と成績の読み書き。保存の失敗は通知に積む。
 *
 * @param store 差し替えるのはテストだけ。既定は端末の localStorage
 */
export const useProgress = (notices: Notices, store: Store = window.localStorage): Progress => ({
  load: () => load(store),
  save: (saved) =>
    notices.report("progress-save", save(store, saved), () => ({
      tone: "warn",
      title: "進捗を保存できません",
      detail: "この端末では保存が使えません。解き進められますが、次回は最初からになります",
    })),
  clear: () => {
    clear(store);
  },
});
