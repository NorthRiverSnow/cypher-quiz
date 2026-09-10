/* why: 接続 URI は neo4j+s://user:pass@host の形を取りうる。ドライバのエラー文にもその形で
   現れるので、外へ出る文字列はクライアント応答もログもここを通す（docs/03_api.md#8-ログ） */
const CREDENTIALS_IN_URI = /([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi;

/* why: Cypher の文字列リテラル。引用符を 2 つ重ねるとエスケープになる */
const LITERAL = String.raw`'(?:[^']|'')*'|"(?:[^"]|"")*"`;

/* why: 管理コマンドはパスワードをリテラルで書く（CREATE USER … SET PASSWORD '…'）。
   読み取り専用の強制が拒否しても、何を止めたかを残すために query.run には出る。
   変更の形は 2 つ並ぶので、先に処理する——片方だけ伏せても意味がない */
const PASSWORD_CHANGE = new RegExp(
  String.raw`(\bPASSWORD\s+FROM\s+)(?:${LITERAL})(\s+TO\s+)(?:${LITERAL})`,
  "gi",
);

const PASSWORD_SET = new RegExp(String.raw`(\bPASSWORD\s+)(?:${LITERAL})`, "gi");

const HIDDEN = "'***'";

/** URI に埋まった利用者名とパスワード、Cypher に書かれたパスワードを取り除く */
export const redact = (text: string): string =>
  text
    .replace(CREDENTIALS_IN_URI, "$1")
    .replace(PASSWORD_CHANGE, `$1${HIDDEN}$2${HIDDEN}`)
    .replace(PASSWORD_SET, `$1${HIDDEN}`);
