/* why: 接続 URI は neo4j+s://user:pass@host の形を取りうる。ドライバのエラー文にもその形で
   現れるので、外へ出る文字列はクライアント応答もログもここを通す（docs/03_api.md#8-ログ） */
const CREDENTIALS_IN_URI = /([a-z][a-z0-9+.-]*:\/\/)[^\s/@]+@/gi;

/** URI に埋まった利用者名とパスワードを取り除く */
export const redact = (text: string): string => text.replace(CREDENTIALS_IN_URI, "$1");
