#!/usr/bin/env python3
"""npm / npx の直叩きを拒否する PreToolUse フック（このプロジェクト限定）。

このリポジトリは Vite+（vp）が pnpm を内部で使う構成。npm install を走らせると
package-lock.json ができて pnpm-lock.yaml と二重管理になり、
pnpm-workspace.yaml の catalog（vite → vite-plus-core）も効かなくなる。

読み取り専用のサブコマンド（view / info など）は通す。バージョン確認に使うため。
pnpm は vp が内部で使うので触らない。
"""
import json, re, shlex, sys

# 副作用の無いものだけ通す
READ_ONLY = {
    "view", "info", "show", "search", "ping", "help", "docs", "repo",
    "outdated", "why", "explain", "ls", "list", "root", "prefix", "bin",
    "config",  # config get は読み取り。set は下で弾く
}
SEPARATORS = re.compile(r"&&|\|\||[;&|\n]")


def deny(reason):
    json.dump({"hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "deny",
        "permissionDecisionReason": reason,
    }}, sys.stdout)
    sys.exit(0)


def main():
    try:
        cmd = json.load(sys.stdin).get("tool_input", {}).get("command", "")
    except Exception:
        sys.exit(0)
    if "npm" not in cmd and "npx" not in cmd:
        sys.exit(0)

    for seg in SEPARATORS.split(cmd):
        try:
            tokens = shlex.split(seg)
        except ValueError:
            continue
        if not tokens:
            continue

        # コマンド名の位置を探す（env VAR=x npm ... のような前置きを飛ばす）
        idx = next((i for i, t in enumerate(tokens)
                    if t in ("npm", "npx") or t.endswith("/npm") or t.endswith("/npx")), None)
        if idx is None:
            continue
        name = "npx" if tokens[idx].endswith("npx") else "npm"

        if name == "npx":
            deny("このプロジェクトでは npx を使わない。`vp dlx <pkg>` を使うこと。")

        sub = next((t for t in tokens[idx + 1:] if not t.startswith("-")), None)
        if sub is None:
            deny("素の `npm` は使わない。`vp` のサブコマンドを使うこと（vp check / vp test / vp add …）。")
        if sub in READ_ONLY:
            if sub == "config" and any(t == "set" for t in tokens[idx + 1:]):
                deny("`npm config set` は使わない。設定は .npmrc を直接編集すること。")
            sys.exit(0)   # 読み取りは通す

        deny(
            f"`npm {sub}` は使わない。このリポジトリは Vite+ が pnpm を内部で使う構成で、"
            "npm を走らせると package-lock.json ができて pnpm-lock.yaml と二重管理になり、"
            "pnpm-workspace.yaml の catalog も効かなくなる。"
            "依存を触るなら `vp add` / `vp remove` / `vp install`、"
            "スクリプトは `vp run <name>` を使うこと。"
        )
    sys.exit(0)


main()
