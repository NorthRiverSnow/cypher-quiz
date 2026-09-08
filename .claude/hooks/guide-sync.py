#!/usr/bin/env python3
"""guide が docs より新しくないかを、セッションの開始時に確かめる SessionStart フック。

guide は兄弟リポジトリ（../nordwind-workshop/guides/）にあり、こちらの編集では
一切動かない。**変わったことに気づく手段が無いと docs が黙って古くなる。**

why: Skill ではなくフックに置く。Skill は呼ばないと動かないので、
「guide が変わった」ことを知る前には呼べない。

why: SessionStart だけで見る。guide は別リポジトリの成果物で、
こちらの作業中に変わるものではない。毎プロンプトで見ると同じ報告を繰り返す。

md5 は docs/06_deck.md が持っている（生成時に書き込まれる）。
別のファイルに持たせると、docs と md5 が別々に古くなる余地ができる。
"""

import hashlib
import json
import os
import pathlib
import re
import sys

DECK_GUIDE = "03_cypher_reference_ja.html"
REGEN = "python3 tools/extract_guide_docs.py"

# guide ごとの、変わったときに直す先
TARGETS = {
    DECK_GUIDE: f"`docs/06_deck.md` を作り直す → `{REGEN}`",
    "01_depends_on_traversal_ja.html": "`docs/05_reference.md` の可変長パスの記述を確かめる",
    "02_match_and_with_ja.html": "`docs/05_reference.md` の MATCH / WITH の記述を確かめる",
}


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    root = pathlib.Path(os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or ".")
    deck = root / "docs" / "06_deck.md"
    guides = root.parent / "nordwind-workshop" / "guides"
    # why: guide が無い環境でも docs だけで読めるのが 06_deck.md の目的。黙って通す
    if not deck.is_file() or not guides.is_dir():
        sys.exit(0)

    recorded = dict(
        re.findall(r"\| `([0-9A-Za-z_.\-]+\.html)` \| `([0-9a-f]{32})` \|", deck.read_text(encoding="utf-8"))
    )
    if not recorded:
        sys.exit(0)

    stale = []
    for name, was in recorded.items():
        path = guides / name
        if not path.is_file():
            stale.append(f"- `{name}` が無くなっている")
            continue
        now = hashlib.md5(path.read_bytes()).hexdigest()
        if now != was:
            stale.append(f"- `{name}` が変わっている → {TARGETS.get(name, '`docs/` の該当記述を確かめる')}")

    if not stale:
        sys.exit(0)

    report = "guide が docs より新しい:\n" + "\n".join(stale)
    json.dump(
        {
            "systemMessage": report,
            "hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": report},
        },
        sys.stdout,
    )
    sys.exit(0)


main()
