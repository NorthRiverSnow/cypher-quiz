import type { Result } from "@cypher-quiz/shared";

import { loadBoxes, saveBoxes, type Store } from "../model/progress";
import type { Boxes } from "../model/quiz";
import type { Notices } from "./useNotices";

export type Progress = Readonly<{
  load: () => Boxes;
  save: (boxes: Boxes) => Result<void, "store-unavailable">;
}>;

/**
 * 習熟度の読み書き。保存の失敗は通知に積む。
 *
 * @param store 差し替えるのはテストだけ。既定は端末の localStorage
 */
export const useProgress = (notices: Notices, store: Store = window.localStorage): Progress => ({
  load: () => loadBoxes(store),
  save: (boxes) =>
    notices.report("progress-save", saveBoxes(store, boxes), () => ({
      tone: "warn",
      title: "進捗を保存できません",
      detail: "この端末では保存が使えません。解き進められますが、次回は最初からになります",
    })),
});
