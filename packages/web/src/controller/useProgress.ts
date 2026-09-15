import type { Result } from "@cypher-quiz/shared";

import { type Store, clear, load, loadSections, save, saveSections } from "../model/progress";
import type { Saved } from "../model/quiz";
import type { SectionId } from "../types";
import type { Notices } from "./useNotices";

export type Progress = Readonly<{
  load: () => Saved;
  save: (saved: Saved) => Result<void, "store-unavailable">;
  /** 前に選んだ章。初めて開いたときは空 */
  loadSections: () => readonly SectionId[];
  saveSections: (sections: readonly SectionId[]) => Result<void, "store-unavailable">;
  /** 最初から解き直すときに消す */
  clear: () => void;
}>;

/* why: 章の選択も同じ種類の通知に積む。書けない理由は同じ localStorage で、
   帯を 2 本出しても利用者にできることは変わらない */
const UNAVAILABLE = {
  tone: "warn",
  title: "進捗を保存できません",
  detail: "この端末では保存が使えません。解き進められますが、次回は最初からになります",
} as const;

/**
 * 進捗と成績、選んだ章の読み書き。保存の失敗は通知に積む。
 *
 * @param store 差し替えるのはテストだけ。既定は端末の localStorage
 */
export const useProgress = (notices: Notices, store: Store = window.localStorage): Progress => ({
  load: () => load(store),
  save: (saved) => notices.report("progress-save", save(store, saved), () => UNAVAILABLE),
  loadSections: () => loadSections(store),
  saveSections: (sections) =>
    notices.report("progress-save", saveSections(store, sections), () => UNAVAILABLE),
  clear: () => {
    clear(store);
  },
});
