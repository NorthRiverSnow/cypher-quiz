import { describe, expect, it } from "vite-plus/test";

import type { Card } from "./deck";
import { DECK } from "./deck.data";
import type { Box } from "./leitner";
import {
  allKeys,
  answerCurrent,
  cardIdOf,
  answered,
  remaining,
  createQuiz,
  currentKey,
  directionOf,
  isComplete,
  keyOf,
  type QuizState,
  chosenFor,
  resetMissed,
  score,
} from "./quiz";
import { createRng } from "./rng";

const small: Card[] = [
  { id: "a", section: "shaping", name: "A", role: "あ", mutates: false },
  { id: "b", section: "shaping", name: "B", role: "い", mutates: false },
  { id: "c", section: "lists", name: "C", role: "う", mutates: false },
];

/** 3 枚 × 2 方向 */
const QUESTIONS = small.length * 2;

/** 1 問につき 2 回続けて正解すると完了する（docs/01_spec.md#6-復習間隔反復） */
const TO_COMPLETE = QUESTIONS * 2;

/** 選んだ肢は「肢」で固定する。並びは出題ごとに変わるので、ここでは中身を問わない */
const CHOSEN = "肢";

const answerAll = (state: QuizState, correct: boolean, times: number) => {
  let next = state;
  for (let i = 0; i < times; i++) next = answerCurrent(next, correct, CHOSEN);

  return next;
};

describe("キー", () => {
  it("カードと方向を往復できる", () => {
    const key = keyOf("optional-match", "reverse");

    expect(cardIdOf(key)).toBe("optional-match");
    expect(directionOf(key)).toBe("reverse");
  });

  it("30 枚から 60 問できる", () => {
    expect(allKeys(DECK)).toHaveLength(60);
    expect(new Set(allKeys(DECK)).size).toBe(60);
  });
});

describe("createQuiz", () => {
  it("全問が box 0 から始まる", () => {
    const state = createQuiz(DECK, createRng(1));

    expect(state.queue).toHaveLength(60);
    expect(remaining(state.boxes, DECK)).toBe(60);
  });

  it("同じシードなら同じ出題順になる", () => {
    expect(createQuiz(DECK, createRng(4)).queue).toEqual(createQuiz(DECK, createRng(4)).queue);
  });

  it("シードが違えば出題順が変わる", () => {
    expect(createQuiz(DECK, createRng(4)).queue).not.toEqual(createQuiz(DECK, createRng(5)).queue);
  });

  it("完了済みは出題しない", () => {
    const boxes = { [keyOf("a", "forward")]: 2 as Box, [keyOf("a", "reverse")]: 2 as Box };
    const state = createQuiz(small, createRng(1), boxes);

    expect(state.queue).toHaveLength(4);
    expect(state.queue).not.toContain(keyOf("a", "forward"));
  });

  /* why: まとめて混ぜると、覚えていないもの（box 0）が後半に流れる */
  it("box の低いものを先に出す", () => {
    const boxes = Object.fromEntries(
      allKeys(small).map((key, idx) => [key, (idx < 3 ? 1 : 0) as Box]),
    );
    const state = createQuiz(small, createRng(2), boxes);
    const boxOrder = state.queue.map((key) => boxes[key]);

    expect(boxOrder).toEqual([0, 0, 0, 1, 1, 1]);
  });
});

describe("続きから始める", () => {
  it("保存した box を引き継ぐ", () => {
    const boxes = {
      [keyOf("a", "forward")]: 2 as Box,
      [keyOf("a", "reverse")]: 1 as Box,
      [keyOf("b", "forward")]: 1 as Box,
    };

    const state = createQuiz(small, createRng(1), boxes);

    expect(remaining(state.boxes, small)).toBe(QUESTIONS - 1);
    expect(state.boxes[keyOf("a", "reverse")]).toBe(1);
  });

  it("残りだけが出題され、完了済みは並ばない", () => {
    const boxes = {
      [keyOf("a", "forward")]: 2 as Box,
      [keyOf("a", "reverse")]: 2 as Box,
      [keyOf("b", "forward")]: 1 as Box,
    };

    const state = createQuiz(small, createRng(1), boxes);

    expect(state.queue).toHaveLength(QUESTIONS - 2);
    expect(state.queue).toContain(keyOf("b", "forward"));
    expect(state.queue).not.toContain(keyOf("a", "forward"));
  });

  /* why: 保存に無いキーは 0 として扱う。カードが増えた回でも前回の進捗を捨てない */
  it("保存に無いカードは box 0 から始まる", () => {
    const state = createQuiz(small, createRng(1), { [keyOf("a", "forward")]: 1 as Box });

    expect(state.boxes[keyOf("c", "reverse")]).toBe(0);
    expect(remaining(state.boxes, small)).toBe(QUESTIONS);
  });

  /* why: 教材からカードが消えても、残った box だけで組み直せる */
  it("デッキに無いキーは持ち込まない", () => {
    const state = createQuiz(small, createRng(1), { "zz:forward": 1 as Box });

    expect(Object.keys(state.boxes)).toHaveLength(QUESTIONS);
    expect(state.boxes["zz:forward"]).toBeUndefined();
  });

  it("途中まで解いた状態から再開すると、解き終えた分だけ減る", () => {
    const first = answerAll(createQuiz(small, createRng(1)), true, 4);
    const resumed = createQuiz(small, createRng(2), first.boxes);

    expect(remaining(resumed.boxes, small)).toBe(remaining(first.boxes, small));
    expect(resumed.queue).toHaveLength(remaining(first.boxes, small));
  });
});

describe("answerCurrent", () => {
  it("正解すると box が 1 つ上がる", () => {
    const state = createQuiz(small, createRng(1));
    const key = currentKey(state) as string;
    const next = answerCurrent(state, true, CHOSEN);

    expect(next.boxes[key]).toBe(1);
  });

  it("2 回正解すると出題から消える", () => {
    let state = createQuiz(small, createRng(1));
    const key = currentKey(state) as string;

    state = answerCurrent(state, true, CHOSEN);
    expect(state.queue).toContain(key);

    state = answerAll(state, true, state.queue.indexOf(key as never) + 1);
    expect(state.queue).not.toContain(key);
  });

  /* why: 1 回目の正解でも間を空ける。すぐ次に出すと、覚えたのではなく直前の答えを見て正解できる */
  it("正解しても完了前なら後ろへ回る", () => {
    const state = createQuiz(small, createRng(1));
    const key = currentKey(state) as string;
    const next = answerCurrent(state, true, CHOSEN);

    expect(next.queue.indexOf(key as never)).toBe(next.queue.length - 1);
  });

  /* why: 数問後ろに差し戻す。すぐ次に出すと、覚えたのではなく直前の答えを見て正解できる */
  it("不正解は box 0 に戻り、数問後ろに差し戻される", () => {
    const state = createQuiz(small, createRng(1));
    const key = currentKey(state) as string;
    const next = answerCurrent(state, false, CHOSEN);

    expect(next.boxes[key]).toBe(0);
    expect(next.queue).toHaveLength(state.queue.length);
    expect(next.queue[0]).not.toBe(key);
    expect(next.queue.indexOf(key as never)).toBe(3);
  });

  it("残りが少なければ末尾に差し戻す", () => {
    let state = createQuiz(small, createRng(1));
    state = answerAll(state, true, TO_COMPLETE);

    expect(isComplete(state)).toBe(true);
    expect(state.queue).toEqual([]);
  });

  it("キューが空なら何も起きない", () => {
    const empty: QuizState = { queue: [], boxes: {}, answers: [] };

    expect(answerCurrent(empty, true, CHOSEN)).toEqual(empty);
  });
});

describe("完了と集計", () => {
  it("全問 2 回正解で完了する", () => {
    const state = answerAll(createQuiz(small, createRng(1)), true, TO_COMPLETE);

    expect(remaining(state.boxes, small)).toBe(0);
    expect(isComplete(state)).toBe(true);
    expect(currentKey(state)).toBeUndefined();
  });

  it("1 問でも残っていれば完了しない", () => {
    const state = answerAll(createQuiz(small, createRng(1)), true, TO_COMPLETE - 2);

    expect(isComplete(state)).toBe(false);
  });
});

/* サマリの「不正解だけもう一度」は、前回の box を渡して組み直すだけ */
describe("残りだけで組み直す", () => {
  it("完了していないものだけがキューに入る", () => {
    const boxes = Object.fromEntries(allKeys(small).map((key) => [key, 2 as Box]));
    const missed = keyOf("c", "reverse");

    const retried = createQuiz(small, createRng(1), { ...boxes, [missed]: 0 as Box });

    expect(retried.queue).toEqual([missed]);
  });

  it("残りが無ければ空になる", () => {
    const boxes = Object.fromEntries(allKeys(small).map((key) => [key, 2 as Box]));

    expect(createQuiz(small, createRng(1), boxes).queue).toEqual([]);
  });
});

describe("成績", () => {
  const first = createQuiz(small, createRng(7));

  it("答える前は全て 0", () => {
    const { asked, correct, missed } = score(first.answers, small);

    expect([asked, correct, missed]).toEqual([0, 0, []]);
  });

  /* why: 数えるのは問題で、回答ではない。同じ問題に 2 回答えても 1 つ */
  it("同じ問題に 2 回答えても、問題は 1 つと数える", () => {
    const wrong = currentKey(first) ?? keyOf("a", "forward");
    const back = answerAll(answerCurrent(first, false, CHOSEN), true, 3);

    expect(currentKey(back)).toBe(wrong);
    expect(back.answers).toHaveLength(4);
    expect(score(answerCurrent(back, true, CHOSEN).answers, small)).toMatchObject({ asked: 4 });
  });

  it("一度も間違えていない問題だけを正解に数える", () => {
    const wrong = currentKey(first) ?? keyOf("a", "forward");
    /* 1 問目を間違え、3 問後ろに戻るまで別の問題に正解する */
    const after = answerAll(answerCurrent(first, false, CHOSEN), true, 3);

    expect(currentKey(after)).toBe(wrong);
    expect(score(after.answers, small)).toMatchObject({ asked: 4, correct: 3 });
  });

  it("間違えたあと正解しても、正解には数えない", () => {
    const after = answerCurrent(
      answerAll(answerCurrent(first, false, CHOSEN), true, 3),
      true,
      CHOSEN,
    );

    expect(score(after.answers, small)).toMatchObject({ asked: 4, correct: 3 });
  });

  /* why: box は「2 回連続で正解したか」しか持たない。間違えたあと正解すると
     box 1 になり、間違えた事実が box からは消える */
  it("間違えたあと正解しても、間違えた記録は残る", () => {
    const wrong = currentKey(first) ?? keyOf("a", "forward");
    const card = small.find(({ id }) => id === cardIdOf(wrong));
    /* 不正解は 3 問後ろに戻る。そこまで正解で進めると、また先頭に来る */
    const back = answerAll(answerCurrent(first, false, CHOSEN), true, 3);

    expect(currentKey(back)).toBe(wrong);

    const fixed = answerCurrent(back, true, CHOSEN);

    expect(fixed.boxes[wrong]).toBe(1);
    expect(score(fixed.answers, small).missed).toEqual([
      { id: card?.id, section: card?.section, name: card?.name, direction: directionOf(wrong) },
    ]);
  });

  it("同じ問題を 2 回間違えても 1 つ", () => {
    const wrong = currentKey(first) ?? keyOf("a", "forward");
    const back = answerAll(answerCurrent(first, false, CHOSEN), true, 3);

    expect(currentKey(back)).toBe(wrong);
    expect(score(answerCurrent(back, false, CHOSEN).answers, small).missed).toHaveLength(1);
  });

  it("章別は出題されなかった章も 0 / 0 で並べる", () => {
    const after = answerAll(first, true, 1);
    const { bySection } = score(after.answers, small);

    expect(bySection).toHaveLength(2);
    expect(bySection.filter(({ asked }) => asked === 0)).toHaveLength(1);
  });

  it("章別の合計が全体と一致する", () => {
    const after = answerCurrent(
      answerAll(answerCurrent(first, false, CHOSEN), true, 3),
      false,
      CHOSEN,
    );
    const { asked, correct, bySection } = score(after.answers, small);

    expect(bySection.reduce((sum, entry) => sum + entry.asked, 0)).toBe(asked);
    expect(bySection.reduce((sum, entry) => sum + entry.correct, 0)).toBe(correct);
  });

  it("全問 2 回連続で正解すると、全問が正解になる", () => {
    const done = answerAll(first, true, TO_COMPLETE);

    expect(isComplete(done)).toBe(true);
    expect(score(done.answers, small)).toMatchObject({
      asked: QUESTIONS,
      correct: QUESTIONS,
      missed: [],
    });
  });
});

describe("resetMissed", () => {
  const first = createQuiz(small, createRng(7));

  it("間違えた問題だけ box を 0 に戻す", () => {
    const wrong = currentKey(first) ?? keyOf("a", "forward");
    const done = answerAll(first, true, TO_COMPLETE);
    const after = { ...done, answers: [{ key: wrong, correct: false, chosen: CHOSEN }] };

    const boxes = resetMissed(after.boxes, after.answers);

    expect(boxes[wrong]).toBe(0);
    expect(Object.values(boxes).filter((box) => box === 2)).toHaveLength(QUESTIONS - 1);
  });

  /* why: キューは保存していないので、box を戻す以外に「この問題だけ出す」を伝える手段が無い */
  it("戻した box から組み直すと、その問題だけが出る", () => {
    const wrong = currentKey(first) ?? keyOf("a", "forward");
    const done = answerAll(first, true, TO_COMPLETE);
    const boxes = resetMissed(done.boxes, [{ key: wrong, correct: false, chosen: CHOSEN }]);

    expect(createQuiz(small, createRng(1), boxes).queue).toEqual([wrong]);
  });

  it("同じ問題を 2 回間違えても 1 度だけ戻す", () => {
    const wrong = currentKey(first) ?? keyOf("a", "forward");
    const done = answerAll(first, true, TO_COMPLETE);
    const answers = [
      { key: wrong, correct: false, chosen: CHOSEN },
      { key: wrong, correct: false, chosen: CHOSEN },
    ];

    expect(createQuiz(small, createRng(1), resetMissed(done.boxes, answers)).queue).toEqual([
      wrong,
    ]);
  });

  it("間違えていなければ何も変わらない", () => {
    const done = answerAll(first, true, TO_COMPLETE);

    expect(resetMissed(done.boxes, done.answers)).toEqual(done.boxes);
  });
});

describe("保存された成績から続ける", () => {
  it("回答を引き継いで組み直せる", () => {
    const answers = [{ key: keyOf("a", "forward"), correct: false, chosen: CHOSEN }] as const;
    const resumed = createQuiz(small, createRng(7), {}, answers);

    expect(score(resumed.answers, small)).toMatchObject({ asked: 1, correct: 0 });
    expect(score(resumed.answers, small).missed).toHaveLength(1);
  });

  it("渡さなければ空から始まる", () => {
    expect(score(createQuiz(small, createRng(7)).answers, small)).toMatchObject({
      asked: 0,
      correct: 0,
    });
  });
});

describe("選んだ肢", () => {
  const first = createQuiz(small, createRng(7));

  it("答えるたびに残す", () => {
    const key = currentKey(first) ?? keyOf("a", "forward");
    const after = answerCurrent(first, false, "違う肢");

    expect(chosenFor(after.answers, key)).toBe("違う肢");
  });

  /* why: 同じ問題に何度も答える。開き直すのは最後に選んだもの */
  it("同じ問題なら最後に選んだものを返す", () => {
    const key = currentKey(first) ?? keyOf("a", "forward");
    const back = answerAll(answerCurrent(first, false, "1 回目"), true, 3);

    expect(currentKey(back)).toBe(key);
    expect(chosenFor(answerCurrent(back, false, "2 回目").answers, key)).toBe("2 回目");
  });

  it("答えていない問題は undefined", () => {
    expect(chosenFor(first.answers, keyOf("a", "forward"))).toBeUndefined();
  });
});

describe("remaining はデッキから数える", () => {
  /* why: 保存された boxes だけを数えない。デッキにカードを足すと、古い保存には
     そのキーが無く、未完了の数が足りなくなる */
  it("保存に無いキーは box 0 として数える", () => {
    expect(remaining({ [keyOf("a", "forward")]: 2 }, small)).toBe(QUESTIONS - 1);
  });

  it("空の保存なら全問が未完了", () => {
    expect(remaining({}, small)).toBe(QUESTIONS);
  });

  it("デッキに無いキーは数えない", () => {
    expect(remaining({ [keyOf("z", "forward")]: 2 }, small)).toBe(QUESTIONS);
  });
});

/* why: 進捗バーは問題の数で数える。box では 1 周目のあいだ動かない */
describe("answered は問題の数で数える", () => {
  const key = keyOf("a", "forward");
  const other = keyOf("b", "reverse");

  it("答える前は全て未回答", () => {
    expect(answered([], small)).toEqual([0, 0, QUESTIONS]);
  });

  it("正解した問題を青に数える", () => {
    expect(answered([{ key, correct: true, chosen: CHOSEN }], small)).toEqual([
      1,
      0,
      QUESTIONS - 1,
    ]);
  });

  it("間違えた問題を赤に数える", () => {
    expect(answered([{ key, correct: false, chosen: CHOSEN }], small)).toEqual([
      0,
      1,
      QUESTIONS - 1,
    ]);
  });

  /* why: 1 度でも間違えたら赤のまま。成績と同じ数え方 */
  it("間違えたあと正解しても赤のまま", () => {
    const answers = [
      { key, correct: false, chosen: CHOSEN },
      { key, correct: true, chosen: CHOSEN },
    ];

    expect(answered(answers, small)).toEqual([0, 1, QUESTIONS - 1]);
  });

  it("同じ問題に何度答えても 1 つ", () => {
    const answers = [
      { key, correct: true, chosen: CHOSEN },
      { key, correct: true, chosen: CHOSEN },
      { key: other, correct: true, chosen: CHOSEN },
    ];

    expect(answered(answers, small)).toEqual([2, 0, QUESTIONS - 2]);
  });

  /* why: デッキから消えたカードの回答が保存に残っていても、未回答を負にしない */
  it("デッキに無い問題の回答があっても 0 で止まる", () => {
    const answers = Array.from({ length: QUESTIONS + 3 }, (_, i) => ({
      key: keyOf(`z${i}`, "forward"),
      correct: true,
      chosen: CHOSEN,
    }));

    expect(answered(answers, small)[2]).toBe(0);
  });
});

describe("不正解一覧は識別子を載せる", () => {
  /* why: 押されたときに URL を組む。名前を使うと、文言を直した瞬間にリンクが壊れる */
  it("カードの id を持つ", () => {
    const first = createQuiz(small, createRng(7));
    const wrong = currentKey(first) ?? keyOf("a", "forward");

    expect(score(answerCurrent(first, false, CHOSEN).answers, small).missed[0]).toEqual({
      id: cardIdOf(wrong),
      section: small.find(({ id }) => id === cardIdOf(wrong))?.section,
      name: small.find(({ id }) => id === cardIdOf(wrong))?.name,
      direction: directionOf(wrong),
    });
  });
});
