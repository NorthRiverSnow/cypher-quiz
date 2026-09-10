#!/usr/bin/env bash
# api / test サービスの入口。依存を整えてから、渡されたコマンドを実行する。
set -e

MODULES=(node_modules packages/shared/node_modules packages/web/node_modules packages/api/node_modules)
MARK=node_modules/.arch

corepack enable

# why: pnpm は別の CPU 向けに入れた node_modules も「入っている」と見なし、--force でも
# 入れ直さない（実測）。volume を使い回して arch が変わると、native binding が見つからず
# 止まる。ここで空にしておけば、そのまま入れ直しになる
if [ "$(cat "$MARK" 2>/dev/null)" != "$(uname -m)" ]; then
  echo "node_modules を $(uname -m) 向けに作り直す"
  for dir in "${MODULES[@]}"; do
    find "$dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  done
fi

# why: 既定の store は置き場を決めるために作業ディレクトリへ一時ファイルを作る。
# /work は読み取り専用なので EROFS になる
pnpm install --frozen-lockfile --store-dir /pnpm-store

uname -m >"$MARK"

exec "$@"
