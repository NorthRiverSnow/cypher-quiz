#!/usr/bin/env python3
"""コードを編集したら、そのファイルに関係するテストだけ走らせる PostToolUse フック。

なぜ `vp test run`（全部）ではないか: 編集のたびに全件走らせると、テストが増えるほど
1 回の編集が重くなる。`vp test related` は import グラフを辿って影響範囲だけ選ぶので、
かかる時間が「変更が波及する範囲」に比例したままになる。

実測（テスト 1 ファイルの時点）:
    全部            1.05s
    related 当たり  0.95s
    related 空振り  0.51s   ← vitest の起動コストだけ。exit 0 で通る
"""
import json, os, pathlib, subprocess, sys

WATCHED = {".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".css"}
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
    if p.suffix not in WATCHED or p.name.endswith(".d.ts"):
        sys.exit(0)

    root = next((d for d in p.parents if (d / "pnpm-workspace.yaml").is_file()), None)
    if root is None or not VP.is_file():
        sys.exit(0)

    # why: vitest related は絶対パスを解決できず "No test files found" で
    # 素通りする。root からの相対パスで渡す
    try:
        target = p.resolve().relative_to(root.resolve())
    except ValueError:
        sys.exit(0)

    env = dict(os.environ)
    env["PATH"] = f"{VP.parent}:{env.get('PATH', '')}"
    try:
        r = subprocess.run([str(VP), "test", "related", str(target)], cwd=root, env=env,
                           capture_output=True, text=True, timeout=110)
    except subprocess.TimeoutExpired:
        sys.exit(0)
    if r.returncode == 0:
        sys.exit(0)

    json.dump({
        "decision": "block",
        "reason": "関係するテストが落ちました。直してください:\n\n"
                  + (r.stdout + r.stderr).strip(),
        "systemMessage": "vp test related 失敗",
    }, sys.stdout)
    sys.exit(0)


main()
