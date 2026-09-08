#!/usr/bin/env python3
"""story を編集したら Storybook の索引を突き合わせる PostToolUse フック。

なぜ必要か: story の title を変えると id が変わる。Storybook 自体は正常なのに
開いていたタブだけが `Couldn't find story matching ...` になり、「壊れた」ように見える。
消えた id を編集直後に知らせて、原因を取り違えないようにする。

検知できるのは索引の異常だけ。描画時のエラーは実際に描かないと分からないので、
それは Skill の storybook-shot で撮って確かめる。
"""
import json, pathlib, sys, urllib.error, urllib.request

INDEX_URL = "http://localhost:6006/index.json"
SNAPSHOT = pathlib.Path(".cache/storybook-index.json")
WATCHED = (".stories.tsx", ".stories.ts")


def fetch_entries():
    with urllib.request.urlopen(INDEX_URL, timeout=4) as r:
        return json.loads(r.read()).get("entries", {})


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)

    path = (payload.get("tool_input", {}).get("file_path")
            or payload.get("tool_response", {}).get("filePath") or "")
    watched = path.endswith(WATCHED) or "/.storybook/" in path
    if not watched:
        sys.exit(0)

    # packages/web にも vite.config.ts があるので、スナップショットが 2 つに割れないよう
    # ワークスペース root を目印にする
    root = next((d for d in pathlib.Path(path).parents
                 if (d / "pnpm-workspace.yaml").is_file()), None)
    if root is None:
        sys.exit(0)
    snap = root / SNAPSHOT

    try:
        entries = fetch_entries()
    except urllib.error.URLError:
        sys.exit(0)          # Storybook が起動していないだけ
    except Exception as e:
        json.dump({
            "systemMessage": f"Storybook の index.json を読めません（{e}）。設定が壊れている可能性があります",
        }, sys.stdout)
        sys.exit(0)

    now = {k: v.get("title", "") for k, v in entries.items()}
    before = {}
    if snap.is_file():
        try:
            before = json.loads(snap.read_text())
        except Exception:
            before = {}

    snap.parent.mkdir(parents=True, exist_ok=True)
    snap.write_text(json.dumps(now, ensure_ascii=False, indent=2))

    if not entries:
        json.dump({"systemMessage": "Storybook の索引が空です。stories の glob を確認してください"},
                  sys.stdout)
        sys.exit(0)

    gone = sorted(set(before) - set(now))
    if not gone:
        sys.exit(0)

    lines = [f"  {g}" + (f"（{before[g]}）" if before.get(g) else "") for g in gone]
    added = sorted(set(now) - set(before))
    if added:
        lines.append("  → 増えた id: " + ", ".join(added))
    json.dump({
        "systemMessage": "story の id が消えました。開いたままのタブは 404 になります:\n"
                         + "\n".join(lines),
    }, sys.stdout)
    sys.exit(0)


main()
