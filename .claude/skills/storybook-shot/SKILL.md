---
name: storybook-shot
description: Storybook の story を Chrome headless で撮って自分で見る。見た目を変えたあと、ユーザーに確認を頼む前に必ず使う。light/dark の両方、拡大しての位置合わせ、CSS 案の比較にも使える。Puppeteer や Playwright の追加は不要。
---

# Storybook を自分で見る

**見た目を変えたら、聞く前に撮る。** ユーザーに確認を頼むのは「どちらが好みか」に絞る。
アイコンの位置合わせのようにマジックナンバーを詰める作業は、自分で見ないと収束しない。

## 1. Storybook が上がっているか確認する

```
lsof -nP -iTCP:6006 -sTCP:LISTEN
```

いなければ上げる。**バックグラウンドで動かす。**

```
cd packages/web && ./node_modules/.bin/storybook dev -p 6006 --no-open
```

`.storybook/main.ts` と `.storybook/preview*` は設定ファイルなので **HMR で拾われない。**
触ったら再起動する（`kill <pid>` → 6006 の解放を待ってから起動）。

## 2. story id を取る

```
curl -s http://localhost:6006/index.json | python3 -c "
import json,sys
for k,v in json.load(sys.stdin).get('entries',{}).items(): print(k,'|',v.get('title'),'|',v.get('name'))
"
```

**日本語の title は URL エンコードが必要。**

```
python3 -c "import urllib.parse;print(urllib.parse.quote('意匠-トークン--すべて'))"
```

## 3. 撮る

```
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for t in light dark; do
  "$CH" --headless=new --disable-gpu --hide-scrollbars --no-sandbox \
    --virtual-time-budget=9000 --window-size=1100,2600 \
    --screenshot=shot_$t.png \
    "http://localhost:6006/iframe.html?id=<id>&globals=theme:${t}&viewMode=story"
done
```

- `globals=theme:light|dark` で `withThemeByDataAttribute` が切り替わる。**必ず両方撮る**
- `--virtual-time-budget=9000` は Google Fonts の到着待ち。短いと書体が当たらないまま写る
- `--window-size` の高さはページ全体が入る値にする。足りないと下が切れる
- 起動時に `CVDisplayLinkCreateWithCGDisplay failed` などが出るが**無害**
- 出力は scratchpad に置く。リポジトリを汚さない

## 4. 細部は切り出して拡大する

**この環境に PIL は無い。** `sips` を使う。

```
sips -c <高さ> <幅> --cropOffset <Y> <X> shot_light.png --out crop.png
sips --resampleHeightWidth <高さ*4> <幅*4> crop.png --out zoom.png
```

**`--cropOffset` は Y X の順**（`sips --help` は `offsetY offsetH` と書いているが誤り）。
切り出し位置は要素を足すとずれるので、外したら範囲を広げて撮り直す。

## 5. CSS の案を比べるとき

story を汚さずに、scratchpad に検証用 HTML を作って**案を縦に並べて 1 枚に撮る。**
tokens.css の値とフォントの link をコピーして貼る。`--force-device-scale-factor=3` を付けると
拡大しなくても細部が読める。

1 往復で決まるので、story を書き換えて撮り直すより速い。

## 見るべきこと

- light と dark の**両方**で崩れていないか
- 幅を狭めてページ全体が横スクロールしないか（`--window-size` の幅を変えて撮る）
- 書体が当たっているか（フォールバックだと字面が変わる）
- アイコンやチップが本文と光学的に揃っているか
