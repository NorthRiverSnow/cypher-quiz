#!/usr/bin/env python3
"""差分を別セッションの Claude にレビューさせる。

    python3 tools/review_step.py [--model haiku]

why: 同じ文脈を持つレビュアーは同じ見落としをする。このプロジェクトでも、
経緯コメント・造語・多義語・空回りのテストを、指摘されるまで自分では検出できなかった。

why: 自動では走らせない。ターンの終わりに毎回走らせると、コードを触っていない
会話のターンでも走ってトークンを使い切る。必要なときに呼ぶ。

why: 未追跡ファイルは中身まで渡す。`git diff HEAD` は未追跡ファイルを含まないので、
パスだけ渡すと新規ファイルばかりのステップが名前だけでレビューされ、
レビュアーは「diff が入っていない」としか言えなくなる。

why: 子セッションに CQ_REVIEW_CHILD を渡す。~/.claude/hooks/teams-notify.sh が
これを見て、子セッションの終了で Teams 通知を送らないようにしている。

why: 子セッションにツールを与えず、CLAUDE.md を prompt に同梱する。
ツールを許すとファイルを読み回って所要が 3 倍になる。
"""

import os
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CLAUDE = pathlib.Path("/opt/homebrew/bin/claude")
GUARD = "CQ_REVIEW_CHILD"
DIFF_LIMIT = 60_000
UNTRACKED_LIMIT = 40_000
TIMEOUT = 300
NO_TOOLS = ["Read", "Grep", "Glob", "Bash", "Edit", "Write", "WebFetch", "WebSearch"]

# why: フック自身の記録を渡すと、レビュー対象がレビューの出力で埋まる
SKIP_PREFIXES = (".cache/",)

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


def git(*args):
    r = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, timeout=30)
    return r.stdout if r.returncode == 0 else ""


def untracked_bodies(names):
    out, budget = [], UNTRACKED_LIMIT
    for name in names:
        try:
            body = (ROOT / name).read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue  # why: 画像やフォントを渡しても読めない
        if len(body) > budget:
            body = body[:budget] + "\n…（長いので打ち切り）"
        out.append(f"--- {name} ---\n{body}")
        budget -= len(body)
        if budget <= 0:
            break
    return "\n\n".join(out)


def changes():
    """レビューの対象。差分と、未追跡ファイルの中身。"""
    diff = git("diff", "HEAD")
    if len(diff) > DIFF_LIMIT:
        diff = diff[:DIFF_LIMIT] + "\n…（長いので打ち切り）"
    names = [
        n
        for n in git("ls-files", "--others", "--exclude-standard").splitlines()
        if n and not n.startswith(SKIP_PREFIXES)
    ]
    return diff, untracked_bodies(names)


def review(diff, bodies, model):
    prompt = PROMPT.format(
        rules=(ROOT / "CLAUDE.md").read_text(encoding="utf-8"),
        diff=diff,
        untracked=bodies or "なし",
    )
    try:
        r = subprocess.run(
            [str(CLAUDE), "-p", prompt, "--model", model, "--disallowedTools", *NO_TOOLS],
            cwd=ROOT,
            env={**os.environ, GUARD: "1"},
            capture_output=True,
            text=True,
            timeout=TIMEOUT,
            # why: 渡さないと子が標準入力を読もうとして数秒待つ
            stdin=subprocess.DEVNULL,
        )
    except subprocess.TimeoutExpired:
        return f"（レビューが {TIMEOUT} 秒で終わらなかった。指摘なしとは限らない）"
    if r.returncode != 0:
        return f"（レビューが失敗した exit={r.returncode}）\n{r.stderr.strip()[:400]}"
    # why: 完全一致で見ると、前置きを付けて「指摘なし」と答えた回が指摘として報告される
    found = [ln for ln in r.stdout.splitlines() if ln.strip() and ln.strip() != "指摘なし"]
    return "\n".join(found)


def main():
    model = "sonnet"
    if "--model" in sys.argv:
        model = sys.argv[sys.argv.index("--model") + 1]
    if not CLAUDE.is_file():
        print(f"claude が無い: {CLAUDE}", file=sys.stderr)
        return 1

    diff, bodies = changes()
    if not diff.strip() and not bodies.strip():
        print("差分なし")
        return 0

    print(review(diff, bodies, model) or "指摘なし")
    return 0


if __name__ == "__main__":
    sys.exit(main())
