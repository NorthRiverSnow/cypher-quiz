export type Token = { name: string; role: string };

export const SURFACES: Token[] = [
  { name: "--ground", role: "背景" },
  { name: "--panel", role: "カード面" },
  { name: "--panel-2", role: "コードブロック背景" },
  { name: "--rule", role: "罫線" },
  { name: "--rule-soft", role: "弱い罫線" },
];

export const INKS: Token[] = [
  { name: "--ink", role: "本文" },
  { name: "--ink-soft", role: "弱い本文" },
  { name: "--muted", role: "ラベル・コメント" },
];

export const SEMANTIC: Token[] = [
  { name: "--accent", role: "構造・キーワード → 選択中の肢、進捗バー" },
  { name: "--keep", role: "正解 → 正答の罫線、正しい肢、コード中のリレーション型" },
  { name: "--alarm", role: "誤り → 誤答の罫線、誤った肢" },
  { name: "--warn", role: "注意 → 罠、引っかけの注記" },
];

export const TINTS: Token[] = [
  { name: "--accent-bg", role: "選択中の肢の面" },
  { name: "--keep-bg", role: "正解の面" },
  { name: "--alarm-bg", role: "誤答の面" },
  { name: "--warn-bg", role: "注意の面" },
];

export const ENTITIES: Token[] = [
  { name: "--team", role: "Team" },
  { name: "--engineer", role: "Engineer" },
  { name: "--service", role: "Service" },
  { name: "--incident", role: "Incident" },
];
