import { type ApiError, type Result, err, ok } from "@cypher-quiz/shared";

/* 分類は docs/03_api.md#実測した分類 */
const READ_ONLY = "r";

/* docs/03_api.md#r-に分類される抜け道。見つけたらここに足す */
const DENIED_OPERATORS: ReadonlySet<string> = new Set([
  "LoadCSV",
  "TerminateTransactions",
  "ShowTransactions",
  "ShowSettings",
]);

/** EXPLAIN が返すプランの木。ドライバの Plan がそのまま入る */
export type Plan = Readonly<{ operatorType: string; children?: readonly Plan[] }>;

/* why: ドライバの ResultSummary.plan は、プランが無いとき undefined ではなく false を返す。
   呼ぶ側それぞれで絞らせず、ここで受ける */
type MaybePlan = Plan | false | undefined;

/* why: operatorType は "LoadCSV@neo4j" の形。@ の後ろは繋いだデータベース名 */
const nameOf = (operatorType: string): string => operatorType.split("@")[0] ?? operatorType;

const operatorsIn = (plan: MaybePlan): readonly string[] =>
  plan === undefined || plan === false
    ? []
    : [nameOf(plan.operatorType), ...(plan.children ?? []).flatMap(operatorsIn)];

/**
 * サーバが分類したクエリを、実行してよいかに変える。
 *
 * why: 通す分類を 1 つに絞る。拒否側を並べると、Neo4j が分類を増やしたときに素通りする。
 * 演算子だけは逆に拒否側を並べる——読み取りの演算子は 100 を超え、並べきれない
 *
 * @param queryType `ResultSummary.queryType`
 * @param plan `ResultSummary.plan`。渡さなければ演算子を見ない
 */
export const acceptReadOnly = (queryType: string, plan?: MaybePlan): Result<void, ApiError> => {
  if (queryType !== READ_ONLY) {
    return err({
      kind: "read-only-violation",
      message: "書き込みを含むクエリは実行できません",
      queryType,
    });
  }

  const denied = operatorsIn(plan).find((operator) => DENIED_OPERATORS.has(operator));

  return denied === undefined
    ? ok(undefined)
    : err({
        kind: "read-only-violation",
        message: `グラフの読み取り以外は実行できません（${denied}）`,
        queryType,
      });
};
