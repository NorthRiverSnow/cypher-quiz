# cypher-quiz

NordWind ワークショップの Cypher 教材の 30 枚のカードを、4 択のフラッシュカードとして解くアプリ。

**1 枚のカードを 2 方向から出す。** 構文 → 目的（`MATCH` は何をする句か）と、
目的 → 構文（形に当てはまる組み合わせを探すのはどの句か）。30 枚 × 2 方向で 60 問になる。

**2 回続けて正解すると、その問題は完了。** 間違えると最初に戻り、数問あとにまた出る
（[Leitner 方式](./docs/01_spec.md#6-復習間隔反復)の簡略版）。60 問すべてを完了するには、
最短でも 120 回の回答が要る。

**章を選んで解ける。** 6 つの章から出す範囲を選ぶ。章ごとに進み具合と成績が残り、
完了した章を選び直せば最初から出し直せる。

進み具合は端末の `localStorage` に残る。**サーバには何も送らない。**

---

## 触ってみる

https://northriversnow.github.io/cypher-quiz/

**この公開版では、クエリを実行できない。** カードの裏にあるサンプルクエリを Neo4j に投げる機能は、
DB に繋ぐサーバ（`packages/api`）が要る。GitHub Pages は静的なファイルしか置けないので、
公開版には含めていない。

クイズそのもの（出題・採点・進み具合・章別の成績）は**すべて動く**。
判定も保存も端末の中で完結していて、サーバを必要としないため。

---

## 手元で動かす — クエリの実行まで

Docker が使えるなら、Neo4j ごと立ち上がる。**教材のデータも自動で入る。**

```
git clone https://github.com/NorthRiverSnow/cypher-quiz.git
cd cypher-quiz
cp .env.example .env
pnpm install
pnpm exec vp run dev   # Vite+ を入れていれば `vp run dev` でよい
```

http://localhost:5173 が開けば、カードの裏でサンプルクエリを編集して実行できる。

**初回は Neo4j のイメージを取りに行くので数分かかる。** 2 回目からはすぐ立ち上がる。

| 要るもの |                                                                               |
| -------- | ----------------------------------------------------------------------------- |
| Node.js  | 22 以上                                                                       |
| pnpm     | `package.json` の `packageManager` が版を決めるので、入っていれば版は問わない |
| Docker   | `docker compose` が動くこと（Docker Desktop / colima / Rancher Desktop など） |

**`.env` には使い捨てのパスワードしか入っていない。** `docker-compose.yml` が立てる dev 用の
Neo4j にだけ使う。手元の他の DB には繋がらない（[歯止め](./docs/03_api.md#歯止め)）。

### よく使うコマンド

**Vite+ を入れていれば `vp …` で直接呼べる。** 入れていなければ `pnpm exec` を付ける
（`vp` は `node_modules` にも入るので、clone しただけで使える）。

|                    |                                                          |
| ------------------ | -------------------------------------------------------- |
| `vp run dev`       | DB → api → web をまとめて起動                            |
| `vp run db:stop`   | DB を止める（データは残る）                              |
| `vp run db:clean`  | コンテナと volume を消す                                 |
| `vp check`         | 整形 + lint + 型                                         |
| `vp run test`      | テスト全部（api の分はコンテナで実行し、終わったら消す） |
| `vp run storybook` | Storybook（6006）                                        |

**読み取り専用は多層で守ってある。** 書き込みのクエリは api が拒否し、Neo4j 側でも
読み取り専用のセッションで実行する（[詳細](./docs/03_api.md#2-読み取り専用の強制多層)）。

---

## 中身

|                   |                                                       |
| ----------------- | ----------------------------------------------------- |
| `packages/web`    | React。画面と出題の仕組み                             |
| `packages/api`    | Hono。Neo4j に繋いでクエリを実行する                  |
| `packages/shared` | 両方が使う型と `Result`                               |
| `docs/`           | **仕様と設計の正。** 実装と食い違ったら docs が正しい |

設計の方針は [`docs/02_architecture.md`](./docs/02_architecture.md)、
仕様は [`docs/01_spec.md`](./docs/01_spec.md) にある。

---

## ライセンス

**このリポジトリのコードは [MIT ライセンス](./LICENSE)。**

依存しているものは、それぞれの作者のライセンスに従う。主なものは次のとおり。

|                                                                                           | ライセンス |
| ----------------------------------------------------------------------------------------- | ---------- |
| React / React DOM / React Router / SWR                                                    | MIT        |
| Hono とその周辺（`@hono/node-server`、`@hono/zod-openapi`、`@scalar/hono-api-reference`） | MIT        |
| Zod                                                                                       | MIT        |
| Vite / Vite+                                                                              | MIT        |
| neo4j-driver                                                                              | Apache-2.0 |

**Neo4j 本体は同梱していない。** `docker-compose.yml` が公式の `neo4j:5` イメージを取得する。
ライセンスは Neo4j の配布元が定めるものに従う。

書体は Google Fonts から読み込む（IBM Plex Mono / Zen Kaku Gothic New / Zen Old Mincho /
Material Symbols Rounded）。**アプリには同梱していない。**

教材の内容は NordWind ワークショップの Session 3 に基づく。
