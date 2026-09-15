import { describe, expect, it } from "vite-plus/test";

import type { Card } from "./deck";
import { DECK } from "./deck.data";
import {
  allKeys,
  cardById,
  cardIdOf,
  cardOf,
  directionOf,
  keyOf,
  keysOf,
  sectionOf,
  sectionsOf,
} from "./quiz.common";

const deck: Card[] = [
  { id: "a", section: "skeleton", name: "A", role: "あ", mutates: false },
  { id: "b", section: "lists", name: "B", role: "い", mutates: false },
];

describe("キー", () => {
  it("カードと方向を往復できる", () => {
    const key = keyOf("optional-match", "reverse");

    expect(cardIdOf(key)).toBe("optional-match");
    expect(directionOf(key)).toBe("reverse");
  });

  /* why: id に `:` が入っても壊れない。後ろから 1 つ目の `:` で切る */
  it("id に区切りが入っても方向を切り出せる", () => {
    const key = keyOf("a:b", "forward");

    expect(cardIdOf(key)).toBe("a:b");
    expect(directionOf(key)).toBe("forward");
  });

  it("30 枚から 60 問できる", () => {
    expect(allKeys(DECK)).toHaveLength(60);
    expect(new Set(allKeys(DECK)).size).toBe(60);
  });
});

describe("引き当て", () => {
  it("id からカードを引く", () => {
    expect(cardById(deck, "b")?.name).toBe("B");
  });

  it("キーからカードと章を引く", () => {
    const key = keyOf("b", "reverse");

    expect(cardOf(deck, key)?.name).toBe("B");
    expect(sectionOf(deck, key)).toBe("lists");
  });

  it("デッキに無いカードは undefined", () => {
    expect(cardById(deck, "z")).toBeUndefined();
    expect(cardOf(deck, keyOf("z", "forward"))).toBeUndefined();
    expect(sectionOf(deck, keyOf("z", "forward"))).toBeUndefined();
  });
});

describe("章で絞る", () => {
  it("章のカードを 2 方向に広げる", () => {
    expect(keysOf(deck, "skeleton")).toEqual([keyOf("a", "forward"), keyOf("a", "reverse")]);
  });

  it("デッキに無い章は空", () => {
    expect(keysOf(deck, "writing")).toEqual([]);
  });

  /* why: デッキに出てくる順。SECTION_LABELS の順だと、デッキに無い章まで並ぶ */
  it("デッキに出てくる章だけを、その順で返す", () => {
    expect(sectionsOf(deck)).toEqual(["skeleton", "lists"]);
  });
});
