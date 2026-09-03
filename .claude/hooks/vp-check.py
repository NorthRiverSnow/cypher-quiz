#!/usr/bin/env python3
"""コードを編集したら `vp check`（fmt + lint + typecheck）を走らせる PostToolUse フック。

なぜ必要か: pre-commit の `vp staged` はコミット時にしか走らない。Claude は
指示があるまでコミットしないので、Claude が書いたコードは一度も検証されない。
そこを埋める。

docs/*.md などコード以外の編集では走らせない（vp check の対象外で無意味なため）。
"""
import json, os, pathlib, subprocess, sys

CODE_SUFFIXES = {".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs",
                 ".css", ".json", ".yaml", ".yml", ".html"}
VP = pathlib.Path.home() / ".local/share/vite-plus/bin/vp"


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    path = (payload.get("tool_input", {}).get("file_path")
            or payload.get("tool_response", {}).get("filePath") or "")
    if not path:
        sys.exit(0)
    p = pathlib.Path(path)
    if p.suffix not in CODE_SUFFIXES:
        sys.exit(0)          # docs/*.md などは対象外

    # プロジェクトルート（vite.config.ts がある所）を上に辿って探す
    root = next((d for d in [p.parent, *p.parents] if (d / "vite.config.ts").is_file()), None)
    if root is None or not VP.is_file():
        sys.exit(0)

    env = dict(os.environ)
    env["PATH"] = f"{VP.parent}:{env.get('PATH', '')}"
    try:
        r = subprocess.run([str(VP), "check"], cwd=root, env=env,
                           capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        sys.exit(0)
    if r.returncode == 0:
        sys.exit(0)

    out = (r.stdout + r.stderr).strip()
    json.dump({
        "decision": "block",
        "reason": "`vp check` が失敗しました。直してください:\n\n" + out,
        "systemMessage": "vp check 失敗",
    }, sys.stdout)
    sys.exit(0)


main()
