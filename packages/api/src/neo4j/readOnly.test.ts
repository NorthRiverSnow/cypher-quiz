import { isOk } from "@cypher-quiz/shared";
import { describe, expect, it } from "vite-plus/test";

import { type Plan, acceptReadOnly } from "./readOnly";

const planOf = (...operators: readonly string[]): Plan =>
  operators.reduceRight<Plan | undefined>(
    (child, operatorType) => ({
      operatorType: `${operatorType}@neo4j`,
      children: child === undefined ? [] : [child],
    }),
    undefined,
  ) ?? { operatorType: "ProduceResults@neo4j" };

describe("acceptReadOnly", () => {
  it("読み取りだけを通す", () => {
    expect(isOk(acceptReadOnly("r"))).toBe(true);
  });

  it.each(["w", "rw", "s"])("%s を拒否する", (queryType) => {
    const result = acceptReadOnly(queryType);

    expect(result).toEqual({
      ok: false,
      error: {
        kind: "read-only-violation",
        message: "書き込みを含むクエリは実行できません",
        queryType,
      },
    });
  });

  /* why: 拒否する側を並べる実装だと、Neo4j が分類を増やしたときに素通りする */
  it("知らない分類も拒否する", () => {
    expect(isOk(acceptReadOnly("いつか増える分類"))).toBe(false);
  });

  it("拒否したときはサーバの分類を返す", () => {
    const result = acceptReadOnly("w");

    expect(isOk(result) ? undefined : result.error.queryType).toBe("w");
  });
});

describe("acceptReadOnly — r の中の抜け道", () => {
  it("ふつうの読み取りは通す", () => {
    expect(
      isOk(acceptReadOnly("r", planOf("ProduceResults", "Expand(All)", "NodeByLabelScan"))),
    ).toBe(true);
  });

  it.each(["LoadCSV", "TerminateTransactions", "ShowTransactions", "ShowSettings"])(
    "%s を含むプランは r でも拒否する",
    (operator) => {
      const result = acceptReadOnly("r", planOf("ProduceResults", operator));

      expect(result).toMatchObject({
        ok: false,
        error: {
          kind: "read-only-violation",
          message: `グラフの読み取り以外は実行できません（${operator}）`,
        },
      });
    },
  );

  /* why: 木の途中にあっても見つける。根だけ見ると LOAD CSV が子に入った形を見落とす */
  it("木の奥にある演算子も見つける", () => {
    expect(
      isOk(acceptReadOnly("r", planOf("ProduceResults", "Limit", "Projection", "LoadCSV"))),
    ).toBe(false);
  });

  /* why: operatorType の @ の後ろは繋いだデータベース名。名前で照合するので切り落とす */
  it("データベース名が付いていても照合できる", () => {
    const plan: Plan = { operatorType: "LoadCSV@ほかのDB", children: [] };

    expect(isOk(acceptReadOnly("r", plan))).toBe(false);
  });

  it("プランを渡さなければ分類だけで決める", () => {
    expect(isOk(acceptReadOnly("r"))).toBe(true);
  });
});

/* why: ドライバはプランが無いとき false を返す。undefined と同じに扱う */
it("プランが false でも分類だけで決める", () => {
  expect(isOk(acceptReadOnly("r", false))).toBe(true);
  expect(isOk(acceptReadOnly("w", false))).toBe(false);
});
