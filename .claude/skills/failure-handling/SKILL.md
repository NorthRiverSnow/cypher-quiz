---
name: failure-handling
description: 失敗の扱い方。副作用のある処理を足すとき、API を呼ぶとき、throw する処理を包むときに読む。attempt で Result に変え、controller の report で通知に積むまで。lint が止めること。
---

# 失敗を握り潰さない

**握り潰しとは、失敗が起きたのに誰にも見えない状態のこと。** 戻り値を捨てる、`catch` して
何もしない、`console.error` だけで終わる——すべて握り潰し。

## 1. どこに書くかを決める

| 失敗の種類     | 例                                                   | 置き場所                     |
| -------------- | ---------------------------------------------------- | ---------------------------- |
| 想定内         | 保存できない、接続できない、書き込み拒否、構文エラー | `model` が `Result` で返す   |
| 想定外（バグ） | `undefined` を読んだ                                 | `throw`。`Result` に包まない |

**`try` を書くのは `shared/result.ts` の `attempt` と `recover` だけ。** throw する API
（`localStorage`、ドライバ、`JSON.parse`）はこの 2 つのどちらかで包む。

**どちらを使うかは「利用者に知らせるか」で決める。**

|            | 使うもの  | 判断                                   |
| ---------- | --------- | -------------------------------------- |
| 知らせる   | `attempt` | 失敗したままだと、利用者が困る         |
| 知らせない | `recover` | 代わりの値で続けても、利用者は困らない |

```ts
// 知らせる: 保存できないと、これから解く分も残らない
attempt(
  () => void store.setItem(KEY, JSON.stringify(boxes)),
  () => "store-unavailable" as const,
);

// 知らせない: 保存が壊れていても、空から始めればクイズは解ける
recover(() => toBoxes(JSON.parse(raw)), {});
```

**`recover` は握り潰しではない。** 握り潰しは「知らせるべき失敗が見えない」こと。
`recover` は知らせないと決めた失敗にだけ使う——決めた理由を `why:` で書く。

## 2. controller で `report` に渡す

**`model` の副作用を呼べるのは `controller` だけ**（`vite.config.ts` の lint が止める）。
呼ぶときは必ず `notices.report` を通す。

```ts
export const useProgress = (notices: Notices, store: Store = window.localStorage): Progress => ({
  save: (boxes) =>
    notices.report("progress-save", saveBoxes(store, boxes), () => ({
      tone: "warn",
      title: "進捗を保存できません",
      detail: "…",
    })),
});
```

- `report` は**受け取った `Result` をそのまま返す**。値を使っても捨ててもよい
- **`err` なら積み、`ok` なら同じ種類の通知を取り下げる。** 成功時に消す処理を別に書かない
- 種類（`NoticeKind`）ごとに 1 件。毎問走る処理でも通知が積み上がらない

**新しい副作用を足したら `NoticeKind` に種類を足す。** 既存の種類に相乗りさせない
（相乗りすると、片方の成功でもう片方の通知が消える）。

## 3. lint が止めること

```
view / pages / routes.tsx → model        エラー
view                      → controller   エラー
model                     → react / view / controller   エラー
```

**`view` から `model/progress` を呼んで戻り値を捨てる道は塞がっている。**
副作用を足すときは `controller` に置く。

## 4. 確かめる

- **変異を当てる。** 「`report` を通さない」「`err` を積まない」「片付けない」に書き換えて
  テストが失敗するか
- **実際に壊す。** `setItem` が throw する偽ストア、`window.dispatchEvent(new ErrorEvent(...))`、
  わざと throw するコンポーネント
- テストで `console.error` を差し替える（React は境界で捕まえた例外もコンソールに出す）

**想定外の例外（`ErrorBoundary` と `useGlobalErrors`）は 1 度きりの仕掛けで、
`main.tsx` と `routes.tsx` に置いてある。** 仕組みは `docs/02_architecture.md#失敗の経路`。
