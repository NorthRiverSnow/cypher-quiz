import type { SectionId } from "../types";
import type { CodeSegment } from "../view/atoms/CodeBlock/CodeBlock";

/* Storybook とテストが共有するサンプル。値は docs/06_deck.md から取っている。
 *
 * TODO: フェーズ B で tools/extract_deck.ts の生成物に置き換える。
 * 今は手で書く——抽出器を先に作ると、雰囲気を見る前にデータ形式が固まる
 * （docs/04_roadmap.md#fixtures-を-a-4-で作る理由）
 */
export type CardFixture = {
  section: SectionId;
  name: string;
  role: string;
  /* 誤答肢は同じ章から引く。answer が正しい肢の位置 */
  choices: readonly string[];
  answer: number;
  code?: readonly CodeSegment[];
  expected?: string;
  note?: string;
  warn?: string;
};

const SKELETON_ROLES = [
  "グラフの中から、指定した形に当てはまる組み合わせをすべて探して行にする",
  "見つからなくても行を捨てず、変数を null にして通す",
  "直前の MATCH または WITH の結果を絞る",
  "クエリを前半と後半に区切り、結果を渡す関所。集約・スコープ切断・集約後の絞り込みが同時に起きる",
];

export const OPTIONAL_MATCH: CardFixture = {
  section: "skeleton",
  name: "OPTIONAL MATCH",
  role: SKELETON_ROLES[1] ?? "",
  choices: SKELETON_ROLES,
  answer: 1,
  code: [
    { text: "// 全エンジニアと、対応した件数", kind: "cm" },
    { text: "\n" },
    { text: "MATCH", kind: "kw" },
    { text: " (e:Engineer)\n" },
    { text: "OPTIONAL MATCH", kind: "kw" },
    { text: " (e)-[:" },
    { text: "RESPONDED_TO", kind: "rel" },
    { text: "]->(i:Incident)\n" },
    { text: "RETURN", kind: "kw" },
    { text: " e.name, count(i) " },
    { text: "AS", kind: "kw" },
    { text: " n\n" },
    { text: "ORDER BY", kind: "kw" },
    { text: " n " },
    { text: "ASC LIMIT", kind: "kw" },
    { text: " 1" },
  ],
  expected: "Killua Zoldyck   0",
  note: "ここを普通の MATCH にすると Killua Zoldyck は行ごと消えて結果は 29 人になる。「居ないこと」を出したいときに必須。",
};

export const WITH: CardFixture = {
  section: "skeleton",
  name: "WITH",
  role: SKELETON_ROLES[3] ?? "",
  choices: SKELETON_ROLES,
  answer: 3,
  code: [
    { text: "// 2チーム以上がまたがって対応したインシデントの数", kind: "cm" },
    { text: "\n" },
    { text: "MATCH", kind: "kw" },
    { text: " (e:Engineer)-[:" },
    { text: "MEMBER_OF", kind: "rel" },
    { text: "]->(t:Team), (e)-[:" },
    { text: "RESPONDED_TO", kind: "rel" },
    { text: "]->(i:Incident)\n" },
    { text: "WITH", kind: "kw" },
    { text: " " },
    { text: "i", kind: "hl" },
    { text: ", count(" },
    { text: "DISTINCT", kind: "kw" },
    { text: " t) " },
    { text: "AS", kind: "kw" },
    { text: " teams_involved   " },
    { text: "← i が暗黙のグループ化キー", kind: "cm" },
    { text: "\n" },
    { text: "WHERE", kind: "kw" },
    { text: " teams_involved > 1                    " },
    { text: "← 集約後の絞り込み = SQL の HAVING", kind: "cm" },
    { text: "\n" },
    { text: "RETURN", kind: "kw" },
    { text: " count(i) " },
    { text: "AS", kind: "kw" },
    { text: " cross_team_incidents" },
  ],
  expected: "52 行 → 20 行 → 13 行 → 1 行（13）",
  note: "集約関数でない項目が自動的にグループ化キーになる。書く語は無い。WITH に並べた変数だけが先に進み、その後の WHERE が HAVING に相当する。",
  warn: "キーは書かれていないので、うっかり増える。WITH i, e, count(DISTINCT t) と項目を 1 つ足すとキーが (i, e) になり、52 行が畳まれず teams_involved は全部 1 になる。エラーは出ない。",
};

const WRITING_ROLES = [
  "無条件に作る。重複チェックをしないので、再実行すると増える",
  "「あれば使う、無ければ作る」。冪等なので何度実行しても同じ状態になる",
  "プロパティとラベルの付け外し",
  "消す。リレーションが残っているノードは普通には消せない",
];

/* 書き込み系。実行させないので、期待される実行結果を持たない */
export const SET_REMOVE: CardFixture = {
  section: "writing",
  name: "SET / REMOVE",
  role: WRITING_ROLES[2] ?? "",
  choices: WRITING_ROLES,
  answer: 2,
  code: [
    { text: "SET", kind: "kw" },
    { text: " s.language = " },
    { text: "'Go'", kind: "hl" },
    { text: "          " },
    { text: "1つ設定", kind: "cm" },
    { text: "\n" },
    { text: "SET", kind: "kw" },
    { text: " s += {tier: 1, sla: 99.9}  " },
    { text: "まとめて追加/更新", kind: "cm" },
    { text: "\n" },
    { text: "SET", kind: "kw" },
    { text: " s =  {name: s.name}        " },
    { text: "全置換（他は消える）", kind: "cm" },
    { text: "\n" },
    { text: "SET", kind: "kw" },
    { text: " s:Critical                 " },
    { text: "ラベルを足す", kind: "cm" },
    { text: "\n\n" },
    { text: "REMOVE", kind: "kw" },
    { text: " s.sla                    " },
    { text: "プロパティを消す", kind: "cm" },
    { text: "\n" },
    { text: "REMOVE", kind: "kw" },
    { text: " s:Critical              " },
    { text: "ラベルを外す", kind: "cm" },
  ],
  warn: "= と += は別物。= は書かなかったプロパティを消す。",
};
