import { useCallback, useState } from "react";

import type { Card } from "../model/deck";
import { DECK } from "../model/deck.data";
import { allKeys, isEverySection, sectionsOf } from "../model/quiz.common";
import { allSectionProgress, startingFrom } from "../model/sections";
import { SECTION_LABELS, type SectionId } from "../types";
import type { Progress } from "./useProgress";

/** スタート画面の 1 行（docs/01_spec.md#7-画面と導線） */
export type SectionOption = Readonly<{
  id: SectionId;
  label: string;
  /** 行の右端。`0 / 10` か `進行中` */
  status: string;
  checked: boolean;
}>;

export type Start = Readonly<{
  sections: readonly SectionOption[];
  /** 「全て」の行の右端 */
  allStatus: string;
  toggle: (section: SectionId) => void;
  /** 全て選ぶか、全て外すか。今の選択で決まる */
  toggleAll: () => void;
  /** 1 つも選んでいなければ始められない */
  canStart: boolean;
  /** 選んだ章で始める。**保存を書き換えるだけで、遷移はしない** */
  start: () => void;
}>;

/**
 * 出す章の選択。
 *
 * why: 遷移しない。保存を書き換えてから画面が移る形に揃える
 * （docs/02_architecture.md#やり直しは保存を書き換えて遷移する）
 */
export const useStart = (progress: Progress, deck: readonly Card[] = DECK): Start => {
  const [saved] = useState(() => progress.load());
  const [selected, setSelected] = useState(() => progress.loadSections());

  const choose = useCallback(
    (next: readonly SectionId[]) => {
      setSelected(next);
      progress.saveSections(next);
    },
    [progress],
  );

  const sections = allSectionProgress(saved.boxes, saved.answers, deck).map(
    ({ section, total, correct, state }): SectionOption => ({
      id: section,
      label: SECTION_LABELS[section],
      /* why: 途中の数は成績ではない。まだ出ていない問題があるので、他の章の `8 / 10` と
         並べると比べられてしまう（docs/01_spec.md#7-画面と導線） */
      status: state === "ongoing" ? "進行中" : `${correct} / ${total}`,
      checked: selected.includes(section),
    }),
  );

  return {
    sections,
    allStatus: `${allKeys(deck).length} 問・最初から`,
    toggle: (section) =>
      choose(
        selected.includes(section)
          ? selected.filter((chosen) => chosen !== section)
          : [...selected, section],
      ),
    toggleAll: () => choose(isEverySection(deck, selected) ? [] : sectionsOf(deck)),
    canStart: selected.length > 0,
    start: () => {
      progress.save(startingFrom(selected, saved.boxes, saved.answers, deck));
    },
  };
};
