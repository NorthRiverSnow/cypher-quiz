/* 取り除くものは docs/03_api.md#redactts-が取り除くもの */
const CREDENTIALS_IN_URI = /([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi;

/* why: 引用符を 2 つ重ねるとエスケープになる */
const LITERAL = String.raw`'(?:[^']|'')*'|"(?:[^"]|"")*"`;

/* why: 変更の形はリテラルが 2 つ並ぶ。SET より先に処理する——片方だけ伏せても意味がない */
const PASSWORD_CHANGE = new RegExp(
  String.raw`(\bPASSWORD\s+FROM\s+)(?:${LITERAL})(\s+TO\s+)(?:${LITERAL})`,
  "gi",
);

const PASSWORD_SET = new RegExp(String.raw`(\bPASSWORD\s+)(?:${LITERAL})`, "gi");

const HIDDEN = "'***'";

export const redact = (text: string): string =>
  text
    .replace(CREDENTIALS_IN_URI, "$1")
    .replace(PASSWORD_CHANGE, `$1${HIDDEN}$2${HIDDEN}`)
    .replace(PASSWORD_SET, `$1${HIDDEN}`);
