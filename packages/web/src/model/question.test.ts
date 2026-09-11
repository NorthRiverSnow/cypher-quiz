import { describe, expect, it } from "vite-plus/test";

import type { SectionId } from "../types";
import type { Card } from "./deck";
import { DECK } from "./deck.data";
import { buildQuestion, CHOICE_COUNT } from "./question";
import { createRng } from "./rng";

const card = (id: string) => DECK.find((entry) => entry.id === id) as Card;

const sectionOf = (text: string, direction: "forward" | "reverse"): SectionId | undefined =>
  DECK.find((entry) => (direction === "forward" ? entry.role : entry.name) === text)?.section;

describe("buildQuestion", () => {
  it("正順は構文を出して目的を選ばせる", () => {
    const question = buildQuestion(card("optional-match"), DECK, "forward", createRng(1));

    expect(question.prompt).toBe("OPTIONAL MATCH");
    expect(question.choices[question.answer]).toBe(card("optional-match").role);
  });

  it("逆順は目的を出して構文を選ばせる", () => {
    const question = buildQuestion(card("optional-match"), DECK, "reverse", createRng(1));

    expect(question.prompt).toBe(card("optional-match").role);
    expect(question.choices[question.answer]).toBe("OPTIONAL MATCH");
  });

  it("肢は 4 つで重複しない", () => {
    for (const entry of DECK) {
      const question = buildQuestion(entry, DECK, "forward", createRng(entry.id.length));

      expect(question.choices).toHaveLength(CHOICE_COUNT);
      expect(new Set(question.choices).size).toBe(CHOICE_COUNT);
    }
  });

  it("不正解の肢は正解と重ならない", () => {
    for (const direction of ["forward", "reverse"] as const) {
      for (const entry of DECK) {
        const question = buildQuestion(entry, DECK, direction, createRng(7));
        const wrong = question.choices.filter((_, idx) => idx !== question.answer);

        expect(wrong).not.toContain(question.choices[question.answer]);
      }
    }
  });

  it("同じ章に足りるときは、不正解の肢も同じ章から取る", () => {
    const question = buildQuestion(card("optional-match"), DECK, "forward", createRng(2));
    const wrong = question.choices.filter((_, idx) => idx !== question.answer);

    expect(wrong.map((text) => sectionOf(text, "forward"))).toEqual([
      "skeleton",
      "skeleton",
      "skeleton",
    ]);
  });

  it("同じ章が足りなければ他の章から補う", () => {
    const small: Card[] = [
      { id: "a", section: "shaping", name: "A", role: "あ", mutates: false },
      { id: "b", section: "shaping", name: "B", role: "い", mutates: false },
      { id: "c", section: "lists", name: "C", role: "う", mutates: false },
      { id: "d", section: "writing", name: "D", role: "え", mutates: true },
    ];

    const question = buildQuestion(small[0] as Card, small, "forward", createRng(5));

    expect([...question.choices].sort()).toEqual(["あ", "い", "う", "え"]);
  });

  it("同じ文言のカードがあっても肢は重複しない", () => {
    const dup: Card[] = [
      { id: "a", section: "shaping", name: "A", role: "あ", mutates: false },
      { id: "b", section: "shaping", name: "B", role: "あ", mutates: false },
      { id: "c", section: "shaping", name: "C", role: "い", mutates: false },
      { id: "d", section: "shaping", name: "D", role: "い", mutates: false },
      { id: "e", section: "shaping", name: "E", role: "う", mutates: false },
    ];

    const question = buildQuestion(dup[0] as Card, dup, "forward", createRng(5));

    expect(new Set(question.choices).size).toBe(question.choices.length);
    expect([...question.choices].sort()).toEqual(["あ", "い", "う"]);
    expect(question.choices[question.answer]).toBe("あ");
  });

  it("肢が足りなければある分だけ出す", () => {
    const two: Card[] = [
      { id: "a", section: "shaping", name: "A", role: "あ", mutates: false },
      { id: "b", section: "shaping", name: "B", role: "い", mutates: false },
    ];

    const question = buildQuestion(two[0] as Card, two, "forward", createRng(5));

    expect([...question.choices].sort()).toEqual(["あ", "い"]);
    expect(question.choices[question.answer]).toBe("あ");
  });

  it("同じシードなら同じ並びになる", () => {
    const first = buildQuestion(card("with"), DECK, "forward", createRng(11));
    const second = buildQuestion(card("with"), DECK, "forward", createRng(11));

    expect(first).toEqual(second);
  });

  it("シードが違えば並びが変わる", () => {
    const orders = new Set(
      Array.from({ length: 8 }, (_, seed) =>
        buildQuestion(card("with"), DECK, "forward", createRng(seed)).choices.join("|"),
      ),
    );

    expect(orders.size).toBeGreaterThan(1);
  });
});
