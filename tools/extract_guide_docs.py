#!/usr/bin/env python3
"""guide 03 の本文を docs/06_deck.md へ書き出す。

30 枚のカードのサンプルクエリ・実行結果・解説・罠は、docs/05_reference.md には
一覧しか無く、本文は兄弟リポジトリの HTML にしか無かった。docs だけでデッキの
中身が読めるようにする。

why: HTML パーサで読む。正規表現で div の入れ子を数えると、カードの中の warn と
カードの外の warn を取り違える。

why: Python で書く。フェーズ B の tools/extract_deck.ts は Token の範囲まで拾って
TypeScript を吐くもので、こちらは docs 向けの本文だけを拾う別の仕事。
"""

import hashlib
import html.parser
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
GUIDES = ROOT.parent / "nordwind-workshop" / "guides"
DECK_GUIDE = "03_cypher_reference_ja.html"
WATCHED = ("01_depends_on_traversal_ja.html", "02_match_and_with_ja.html", DECK_GUIDE)
OUT = ROOT / "docs" / "06_deck.md"

# guide の h2 と SectionId（docs/02_architecture.md#4-デッキ生成）の対応
SECTIONS = {
    "読み取りの骨格": "skeleton",
    "パターンの書き方": "patterns",
    "結果の整形": "shaping",
    "リストと集約": "lists",
    "書き込み": "writing",
    "サブクエリ・スキーマ・診断": "subqueries",
}

# why: docs/05_reference.md#データセット が同じ表を持つ。二重に置くと片方だけ古くなる
SKIP_SECTIONS = {"このデータに何が入っているか"}

BLOCKISH = {"p", "ul", "ol", "pre", "table", "div", "figure", "blockquote", "h3", "h4"}

VOID = {"br", "hr", "img", "input", "meta", "link", "path", "circle", "line", "rect", "use"}


class Node:
    def __init__(self, tag="", attrs=None):
        self.tag = tag
        self.attrs = dict(attrs or [])
        self.kids = []

    @property
    def classes(self):
        return self.attrs.get("class", "").split()

    def children(self, tag=None, cls=None):
        for k in self.kids:
            if isinstance(k, Node) and (tag is None or k.tag == tag) and (cls is None or cls in k.classes):
                yield k

    def descendants(self, tag=None, cls=None):
        for k in self.kids:
            if isinstance(k, Node):
                if (tag is None or k.tag == tag) and (cls is None or cls in k.classes):
                    yield k
                yield from k.descendants(tag, cls)


class Tree(html.parser.HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].kids.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.stack[-1].kids.append(Node(tag, attrs))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                return

    def handle_data(self, data):
        self.stack[-1].kids.append(data)


def raw(node):
    if isinstance(node, str):
        return node
    if node.tag == "br":
        return "\n"
    return "".join(raw(k) for k in node.kids)


def squeeze(s):
    """段落内の改行と字下げを空白 1 つにする。<br> が入れた改行は残す。"""
    return re.sub(r"[ \t]*\n[ \t]*(?!\n)", " ", re.sub(r"[ \t]+", " ", s)).strip()


def inline(node):
    """見た目のタグを markdown の記法に置き換える。"""
    if isinstance(node, str):
        return node
    if node.tag == "br":
        return "\n"
    body = "".join(inline(k) for k in node.kids)
    if node.tag in ("code", "kbd") or "mono" in node.classes:
        return f"`{squeeze(body)}`"
    if node.tag in ("b", "strong"):
        return f"**{squeeze(body)}**"
    if node.tag in ("i", "em"):
        return f"*{squeeze(body)}*"
    if node.tag == "a":
        href = node.attrs.get("href", "")
        # why: guide 内のアンカーはカードの id で、この文書の見出しがそのまま同じ id になる
        return f"[{squeeze(body)}]({href})" if href.startswith("#") else squeeze(body)
    return body


def as_table(table):
    rows = []
    for tr in table.descendants("tr"):
        cells = [c for c in tr.kids if isinstance(c, Node) and c.tag in ("th", "td")]
        rows.append([squeeze(inline(c)).replace("|", "\\|").replace("\n", "<br>") for c in cells])
    if not rows:
        return []
    return (
        ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * len(rows[0])]
        + ["| " + " | ".join(r) + " |" for r in rows[1:]]
    )


def as_list(node):
    ordered = node.tag == "ol"
    return [
        f"{i + 1}. {squeeze(inline(li))}" if ordered else f"- {squeeze(inline(li))}"
        for i, li in enumerate(node.children("li"))
    ]


def figure_md(node):
    svg = next(node.descendants("svg"), None)
    label = squeeze(svg.attrs.get("aria-label", "")) if svg else ""
    caption = next((squeeze(inline(c)) for c in node.descendants("figcaption")), "")
    # why: SVG は markdown に持ち込めないので、代わりに aria-label を引く。
    #      図の内容が文で書かれている唯一の場所
    lines = [f"（図 — {label}）"] if label else []
    if caption:
        lines += ([""] if lines else []) + [caption]
    return lines


def block(node):
    """カードや章の中の 1 要素を markdown の行にする。"""
    kinds = node.classes
    if "card-sub" in kinds:
        # why: match カードは syntax の pre と query の pre が続く。この札が無いと
        #      どちらが実行できるサンプルなのか読めなくなる
        return [f"**{squeeze(raw(node))}**"]
    if node.tag == "pre":
        return ["```cypher", raw(node).strip("\n"), "```"]
    if "res" in kinds:
        # why: 実行結果は空白で桁を揃えてある。段落にすると桁が崩れるので fence に入れる
        return ["結果:", "", "```", raw(node).strip("\n"), "```"]
    if "warn" in kinds:
        return ["> **罠** — " + squeeze(inline(node)).replace("\n", "\n> ")]
    if node.tag == "figure" or "figframe" in kinds:
        return figure_md(node)
    if node.tag == "table":
        return as_table(node)
    if "tablewrap" in kinds:
        table = next(node.descendants("table"), None)
        return as_table(table) if table else []
    if node.tag in ("ul", "ol"):
        return as_list(node)
    if node.tag in ("h3", "h4"):
        return [f"**{squeeze(inline(node))}**"]
    if node.tag in ("div", "blockquote") and any(
        isinstance(k, Node) and k.tag in BLOCKISH for k in node.kids
    ):
        # why: 段落を包む div を 1 行に潰すと、ラベルと本文が地続きになる
        out = []
        for k in node.children():
            lines = [f"**{squeeze(raw(k))}**"] if "tag" in k.classes else block(k)
            if lines:
                out += lines + [""]
        return out[:-1] if out and out[-1] == "" else out
    if node.tag in ("p", "div", "blockquote"):
        body = squeeze(inline(node))
        return [body] if body else []
    return []


def name_md(name):
    """カード名を markdown で安全にする。

    why: 名前は `*1..3` や `-[ ]->` のような記法そのもので、太字に入れると
    `**` と併せて強調記号として解釈される。バッククォートで囲んで無効にする。
    """
    head, sep, tail = name.partition(" — ")
    return f"`{head}`" + (f" — {tail}" if sep else "")


def card_md(card):
    name = next((squeeze(raw(k)) for k in card.children(cls="card-name")), "")
    role = next((squeeze(inline(k)) for k in card.children(cls="card-role")), "")
    # docs/05_reference.md#30-枚のカード のとおり、name が出題の表、role が裏
    out = [
        f"### {card.attrs.get('id', '')}",
        "",
        f"**名前**: {name_md(name)}",
        "",
        f"**役割**: {role}",
        "",
    ]
    for k in card.children():
        if {"card-name", "card-role"} & set(k.classes):
            continue
        lines = block(k)
        if lines:
            out += lines + [""]
    return out


def section_md(section):
    h2 = next(section.descendants("h2"), None)
    title = squeeze(raw(h2)) if h2 else ""
    if not title or title in SKIP_SECTIONS:
        return [], 0
    eyebrow = next((squeeze(raw(p)) for p in section.descendants(cls="sec-label")), "")
    section_id = SECTIONS.get(title)
    head = f"## {title}"
    if section_id:
        head += f" — `{section_id}`"
    out = [head, ""]
    if eyebrow:
        out += [f"`{eyebrow}`", ""]

    cards = 0
    for node in section.children():
        if {"sec-label"} & set(node.classes) or node.tag == "h2":
            continue
        if "cards" in node.classes:
            for card in node.children(cls="card"):
                out += card_md(card)
                cards += 1
            continue
        lines = block(node)
        if lines:
            out += lines + [""]
    return out, cards


def md5(path):
    return hashlib.md5(path.read_bytes()).hexdigest()


def render(src):
    tree = Tree()
    tree.feed(src)
    body, total = [], 0
    for section in tree.root.descendants("section"):
        lines, cards = section_md(section)
        if lines:
            body += lines + ["---", ""]
        total += cards

    checks = [f"| `{n}` | `{md5(GUIDES / n)}` |" for n in WATCHED if (GUIDES / n).is_file()]
    head = [
        "# デッキの元本",
        "",
        f"`guides/{DECK_GUIDE}` の本文。**このファイルは生成物。** 直接編集しない。",
        "",
        "```",
        "python3 tools/extract_guide_docs.py",
        "```",
        "",
        "guide が変わったら作り直す。変わったことは SessionStart のフックが",
        "下の md5 と実物を比べて報告する（`.claude/hooks/guide-sync.py`）。",
        "",
        "| guide | md5 |",
        "|---|---|",
        *checks,
        "",
        f"カード {total} 枚。id は guide の `div.card` の id で、",
        "[`02_architecture.md`](./02_architecture.md#4-デッキ生成) の `CardId` と同じ値。",
        "",
        "載せていないもの:",
        "",
        "- **`§ Prerequisite`** — [`05_reference.md`](./05_reference.md#データセット) が同じ表を持つ",
        "- **ハイライトの範囲** — `span.kw` などの位置は文字数で持つ値で、",
        "  フェーズ B の `tools/extract_deck.ts` が HTML から直接拾う",
        "- **実行結果の強調** — `<b>` は fence の中では記法にならないので、値だけが残る",
        "",
        "---",
        "",
    ]
    return "\n".join(head + body).rstrip() + "\n", total


def main():
    guide = GUIDES / DECK_GUIDE
    if not guide.is_file():
        print(f"guide が無い: {guide}", file=sys.stderr)
        return 1
    text, total = render(guide.read_text(encoding="utf-8"))
    OUT.write_text(text, encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} を書いた（カード {total} 枚 / {len(text.splitlines())} 行）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
