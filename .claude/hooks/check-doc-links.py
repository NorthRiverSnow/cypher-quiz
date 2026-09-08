#!/usr/bin/env python3
"""docs/ を編集したら相互リンクとアンカーを検証する PostToolUse フック。

日本語見出しのアンカーは間違えやすい（`、` や `—` が落ち、空白が 1 対 1 で
ハイフンになる）。壊れても見た目に出ないので機械で拾う。
"""
import json, pathlib, re, sys, unicodedata


def slug(heading: str) -> str:
    """GitHub 相当: 小文字化 → 記号を除去 → 空白を 1 対 1 でハイフンに（畳まない）"""
    s = heading.strip().lower()
    s = "".join(c for c in s
                if c.isalnum() or c in " -_" or unicodedata.category(c).startswith("L"))
    return s.strip().replace(" ", "-")


def main():
    try:
        payload = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    path = (payload.get("tool_input", {}).get("file_path")
            or payload.get("tool_response", {}).get("filePath") or "")
    if "docs/" not in path.replace("\\", "/"):
        sys.exit(0)

    root = pathlib.Path(path.replace("\\", "/").split("docs/")[0] or ".") / "docs"
    if not root.is_dir():
        sys.exit(0)

    anchors, texts = {}, {}
    for f in sorted(root.glob("*.md")):
        texts[f.name] = f.read_text(encoding="utf-8")
        anchors[f.name] = {slug(m.group(1))
                           for m in re.finditer(r"^#{1,6}\s+(.*)$", texts[f.name], re.M)}

    broken = []
    for name, text in texts.items():
        for m in re.finditer(r"\]\(\./([0-9A-Za-z_\-]+\.md)(?:#([^)]*))?\)", text):
            tgt, anc = m.group(1), m.group(2)
            if tgt not in anchors:
                broken.append(f"{name} -> {tgt}（ファイルが無い）")
            elif anc and anc not in anchors[tgt]:
                near = [a for a in anchors[tgt] if anc[:6] in a]
                hint = f" 近い見出し: {near[0]}" if near else ""
                broken.append(f"{name} -> {tgt}#{anc}（アンカーが無い）{hint}")

    if broken:
        json.dump({
            "decision": "block",
            "reason": "docs のリンクが壊れています:\n  " + "\n  ".join(broken),
            "systemMessage": f"docs のリンク {len(broken)} 件が未解決",
        }, sys.stdout)
    sys.exit(0)


main()
