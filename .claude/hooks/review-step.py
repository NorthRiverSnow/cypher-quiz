#!/usr/bin/env python3
"""ステップの終わりに、独立した Claude セッションで変更をレビューする Stop フック。

なぜ独立したセッションか: 同じ文脈を持つレビュアーは同じ見落としをする。
このプロジェクトでも、経緯コメント・造語・多義語・重複した story を、
指摘されるまで自分では検出できなかった。

なぜ編集ごと（PostToolUse）ではないか: 1 ターンで複数ファイルを書くと、
作りかけの状態を何度もレビューすることになる（story を書く前の部品に
「どこからも使われていない」と指摘が付く）。ステップ単位で 1 回にする。

**報告だけで、私を継続させない。** 指摘の当否は人が判断する。

CLAUDE.md を prompt に同梱し、子セッションにツールを与えない。
ツールを許すとファイルを読み回って所要が 165 秒になり、毎ターン待てなくなる（同梱なら 56 秒）。

再帰の防止が要る。`claude -p` の子セッションもプロジェクトの Stop フックを実行するため
（実測で確認）、何もしなければ子が孫を起動して止まらなくなる。
**`--settings '{"hooks":{}}'` では防げない**（渡してもプロジェクトのフックは実行された）。
env の継承は実測で確認できたのでそれを主にし、継承が壊れた場合の保険にロックを足す。
"""
import json, os, pathlib, subprocess, sys

GUARD = "CQ_REVIEW_CHILD"
CLAUDE = pathlib.Path("/opt/homebrew/bin/claude")
DIFF_LIMIT = 60_000
NO_TOOLS = ["Read", "Grep", "Glob", "Bash", "Edit", "Write", "WebFetch", "WebSearch"]

PROMPT = """次の規約に照らして diff をレビューしてください。

見るもの:
1. 規約への違反
2. 明らかな誤り・壊れているコード
3. 壊しても失敗しないテスト

出力は日本語。指摘ごとに `パス — 何が問題か` の 1 行だけ。最大 8 件。
前置きも要約も書かないでください。指摘が無ければ `指摘なし` の 4 文字だけを返してください。

--- 規約（CLAUDE.md） ---
{rules}

--- git diff HEAD ---
{diff}

--- 未追跡ファイル ---
{untracked}
"""


def git(root, *args):
    r = subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, timeout=30)
    return r.stdout if r.returncode == 0 else ""


def review(root):
    diff = git(root, "diff", "HEAD")
    untracked = git(root, "ls-files", "--others", "--exclude-standard")
    if not diff.strip() and not untracked.strip():
        return None
    if len(diff) > DIFF_LIMIT:
        diff = diff[:DIFF_LIMIT] + "\n…（長いので打ち切り）"

    prompt = PROMPT.format(
        rules=(root / "CLAUDE.md").read_text(),
        diff=diff,
        untracked=untracked or "なし",
    )
    env = dict(os.environ)
    env[GUARD] = "1"
    try:
        r = subprocess.run(
            [str(CLAUDE), "-p", prompt, "--model", "sonnet", "--disallowedTools", *NO_TOOLS],
            cwd=root, env=env, capture_output=True, text=True, timeout=240,
            # why: 渡さないとフックに来た JSON の残りを子が読もうとして 3 秒待つ
            stdin=subprocess.DEVNULL,
        )
    except subprocess.TimeoutExpired:
        # why: 黙って None を返すと「指摘なし」と区別できない。実測 60〜150 秒でばらつく
        return "（レビューが 240 秒で終わらなかった。指摘なしとは限らない）"
    out = r.stdout.strip()
    if r.returncode != 0:
        return f"（レビューが失敗した exit={r.returncode}）"
    return None if not out or out == "指摘なし" else out


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    if payload.get("stop_hook_active") or os.environ.get(GUARD):
        sys.exit(0)

    root = pathlib.Path(os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or ".")
    if not (root / "CLAUDE.md").is_file() or not CLAUDE.is_file():
        sys.exit(0)

    lock = root / ".cache" / "review-step.lock"
    lock.parent.mkdir(parents=True, exist_ok=True)
    try:
        fd = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        sys.exit(0)
    os.close(fd)
    try:
        found = review(root)
    finally:
        lock.unlink(missing_ok=True)

    if found:
        json.dump({"systemMessage": "レビュー（別セッション）:\n" + found}, sys.stdout)
    sys.exit(0)


main()
