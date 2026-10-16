#!/usr/bin/env python3
"""Marca con data-i18n los textos visibles de una pagina para el selector de idioma.

El HTML se queda en espanol (es lo que lee Google): este script solo anade
atributos, y como mucho envuelve en <span data-i18n> un texto suelto que
comparte padre con un icono o un bloque. No reserializa el documento: inserta
en las posiciones exactas del fuente, asi que el diff es solo eso.

  · data-i18n="clave"            -> el contenido del elemento (texto o HTML en linea)
  · data-i18n-attr="alt:clave"   -> atributos traducibles (alt, placeholder,
                                    aria-label, title), separados por ";"

Fuera de su alcance: <nav class="wm-nav">, el cajon movil y el footer comun
(los marca scripts/nav_rebuild.py con claves de assets/i18n/common.json),
<script>, <style>, <svg>, <noscript> y cualquier subarbol con data-i18n-skip.

Idempotente: si la pagina ya tiene data-i18n en su contenido, no la toca.
Con --dump escribe el texto espanol de cada clave (para traducir) en un JSON.

Uso:
    python scripts/i18n_mark.py index.html home --dump /ruta/home.es.json
"""
from __future__ import annotations

import argparse
import html
import json
import re
import sys
from html.parser import HTMLParser

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}
# Formato en linea: si un elemento solo contiene esto, se traduce entero (HTML).
INLINE = {"a", "abbr", "b", "br", "cite", "code", "em", "i", "kbd", "mark", "q",
          "s", "small", "span", "strong", "sub", "sup", "time", "u", "wbr"}
OPAQUE = {"script", "style", "svg", "noscript", "template", "iframe", "textarea"}
ATTRS = ("alt", "placeholder", "aria-label", "title")
LETTER = re.compile(r"[A-Za-zÀ-ÿ]")
# Lo que se queda igual en los tres idiomas: no merece clave.
INVARIANT = re.compile(
    r"^(WhiteMoon|WHITEMOON|WHITE|MOON|Spark|Core Spark Web|Agente IA Citas|"
    r"ChatGPT|Grok|Gemini|Perplexity|Claude|Google|WhatsApp|Instagram|TikTok|"
    r"LinkedIn|YouTube|Email|SEO|GEO|AEO|GEO/AEO|IA|Bambú Sushi|Majadahonda|Madrid|"
    r"[\w.+-]+@[\w.-]+|https?://\S+|[\d\s+().-]+)$"
)


class Node:
    __slots__ = ("tag", "attrs", "start", "tag_end", "close", "children", "parent", "raw")

    def __init__(self, tag, attrs, start, tag_end, parent, raw):
        self.tag, self.attrs, self.start, self.tag_end = tag, dict(attrs), start, tag_end
        self.close = None          # offset del "<" de la etiqueta de cierre
        self.children = []         # Node | (ini, fin) de texto
        self.parent, self.raw = parent, raw


class Tree(HTMLParser):
    def __init__(self, src: str):
        super().__init__(convert_charrefs=False)
        self.src = src
        self.lines = [0]
        for m in re.finditer("\n", src):
            self.lines.append(m.end())
        self.root = Node("#root", [], 0, 0, None, "")
        self.stack = [self.root]
        self.errors = []

    def off(self):
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag, attrs):
        start = self.off()
        raw = self.get_starttag_text()
        node = Node(tag, attrs, start, start + len(raw), self.stack[-1], raw)
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        start = self.off()
        raw = self.get_starttag_text()
        self.stack[-1].children.append(Node(tag, attrs, start, start + len(raw), self.stack[-1], raw))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i].tag == tag:
                if i != len(self.stack) - 1:
                    self.errors.append(f"cierre </{tag}> con abiertos {[n.tag for n in self.stack[i + 1:]]}")
                self.stack[i].close = self.off()
                del self.stack[i:]
                return
        self.errors.append(f"cierre </{tag}> sin abrir en {self.getpos()}")

    def _text(self, length):
        start = self.off()
        self.stack[-1].children.append((start, start + length))

    def handle_data(self, data):
        self._text(len(data))

    def handle_comment(self, data):
        # Un comentario corta el tramo de texto: no puede acabar dentro de un <span>.
        self.stack[-1].children.append(None)

    def handle_entityref(self, name):
        self._text(self.src.find(";", self.off()) + 1 - self.off())

    def handle_charref(self, name):
        self._text(self.src.find(";", self.off()) + 1 - self.off())


def classes(n: Node) -> set[str]:
    return set((n.attrs.get("class") or "").split())


# --sin-cifras (/precios/): ninguna cifra se traduce ni se mueve. Un bloque
# con "€" queda fuera entero y cualquier texto con un digito se queda sin clave.
SIN_CIFRAS = False
SRC = ""
EURO = re.compile(r"€|&euro;|&#8364;", re.I)
DIGIT = re.compile(r"\d")


def opaque(n: Node) -> bool:
    if n.tag in OPAQUE or "data-i18n-skip" in n.attrs:
        return True
    if SIN_CIFRAS and n.close is not None:
        inside = SRC[n.tag_end:n.close]
        # Expresion de precio ("59 €/mes", "Alta unica 299 €"): bloque corto
        # con €, fuera entero, unidad incluida.
        if EURO.search(inside) and len(" ".join(re.sub(r"<[^>]+>", " ", inside).split())) <= 80:
            return True
    if n.tag == "nav" and "wm-nav" in classes(n):
        return True
    if n.tag == "aside" and "wm-drawer" in classes(n):
        return True
    if n.tag == "footer" and "wm-foot" in classes(n):
        return True
    return False


def runs(n: Node, src: str):
    """Tramos de texto directo contiguos (texto + entidades pegadas)."""
    out, cur = [], None
    for c in n.children:
        if isinstance(c, tuple):
            cur = (cur[0], c[1]) if cur else c
        else:                       # elemento o comentario: corta el tramo
            if cur:
                out.append(cur)
            cur = None
    if cur:
        out.append(cur)
    return [r for r in out if src[r[0]:r[1]].strip()]


def meaningful(text: str) -> bool:
    t = " ".join(html.unescape(text).split())
    if SIN_CIFRAS and (DIGIT.search(t) or EURO.search(t)):
        return False
    return bool(LETTER.search(t)) and not INVARIANT.match(t)


def rich_safe(n: Node) -> bool:
    """Solo formato en linea por dentro, sin ids ni ganchos de JS que perder."""
    for c in n.children:
        if isinstance(c, tuple):
            continue
        if c is None:               # un comentario dentro: mejor no tocar su HTML
            return False
        if c.tag not in INLINE or "id" in c.attrs or any(k.startswith(("data-", "on")) for k in c.attrs):
            return False
        if not rich_safe(c):
            return False
    return True


def inner(n: Node, src: str) -> str:
    return " ".join(src[n.tag_end:n.close].split())


def mark(src: str, page: str):
    global SRC
    SRC = src
    tree = Tree(src)
    tree.feed(src)
    tree.close()
    if tree.errors:
        raise SystemExit("HTML mal anidado, no toco nada:\n  " + "\n  ".join(tree.errors[:10]))

    edits = []          # (offset, texto a insertar)
    dump = {}
    counters = {}
    section = ["top"]

    def key():
        s = section[-1]
        counters[s] = counters.get(s, 0) + 1
        return f"{s}.{counters[s]}"

    def add_attr(n: Node, text: str):
        # Antes del ">" (o "/>") de la etiqueta de apertura.
        raw = n.raw
        cut = len(raw) - (2 if raw.endswith("/>") else 1)
        while cut > 0 and raw[cut - 1].isspace():
            cut -= 1
        edits.append((n.start + cut, text))

    def visit(n: Node, covered: bool):
        pushed = False
        if n.tag in ("section", "header", "main", "article", "aside", "form", "dialog") and n.attrs.get("id"):
            section.append(re.sub(r"[^a-z0-9-]", "", n.attrs["id"].lower()) or section[-1])
            pushed = True

        if not covered:
            pairs = []
            for a in ATTRS:
                v = n.attrs.get(a)
                if v and meaningful(v):
                    k = key()
                    pairs.append(f"{a}:{k}")
                    dump[k] = html.unescape(v)
            if pairs:
                add_attr(n, f' data-i18n-attr="{";".join(pairs)}"')

            texts = runs(n, src)
            if (SIN_CIFRAS and texts and n.close is not None and rich_safe(n)
                    and (DIGIT.search(src[n.tag_end:n.close]) or EURO.search(src[n.tag_end:n.close]))):
                # Frase con una cifra dentro (p. ej. "Hasta <b>5</b> paginas"):
                # entera en espanol; trocearla dejaria medias frases traducidas.
                covered = True
            elif texts and any(meaningful(src[a:b]) for a, b in texts):
                if rich_safe(n) and n.close is not None:
                    k = key()
                    add_attr(n, f' data-i18n="{k}"')
                    dump[k] = html.unescape(inner(n, src)) if all(isinstance(c, tuple) for c in n.children) else inner(n, src)
                    covered = True
                else:
                    for a, b in texts:
                        t = src[a:b]
                        if not meaningful(t):
                            continue
                        lead = len(t) - len(t.lstrip())
                        trail = len(t) - len(t.rstrip())
                        k = key()
                        edits.append((a + lead, f'<span data-i18n="{k}">'))
                        edits.append((b - trail, "</span>"))
                        dump[k] = html.unescape(" ".join(t.split()))

        for c in n.children:
            if isinstance(c, Node) and not opaque(c):
                visit(c, covered)
        if pushed:
            section.pop()

    body = next((c for c in tree.root.children if isinstance(c, Node) and c.tag == "html"), tree.root)
    body = next((c for c in body.children if isinstance(c, Node) and c.tag == "body"), body)
    visit(body, False)

    out = src
    for off, text in sorted(edits, key=lambda e: e[0], reverse=True):
        out = out[:off] + text + out[off:]
    return out, dump


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("page")
    ap.add_argument("--dump")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--sin-cifras", action="store_true",
                    help="no marca nada con digitos ni bloques con € (/precios/)")
    args = ap.parse_args()
    global SIN_CIFRAS
    SIN_CIFRAS = args.sin_cifras
    with open(args.file, encoding="utf-8", newline="") as fh:
        src = fh.read()
    body = src[src.lower().find("<body"):]
    # La barra, el cajon y el footer los marca nav_rebuild.py (el footer puede
    # llevar id="contacto" delante de la clase).
    body = re.sub(r'<(nav|aside|footer)\b[^>]*class="wm-(nav|drawer|foot)[\s\S]*?</\1>', "", body)
    if "data-i18n" in body:
        print(f"{args.file}: ya marcada, no se toca")
        return 0
    out, dump = mark(src, args.page)
    print(f"{args.file}: {len(dump)} claves")
    if args.dump:
        with open(args.dump, "w", encoding="utf-8") as fh:
            json.dump(dump, fh, ensure_ascii=False, indent=1)
    if not args.check:
        with open(args.file, "w", encoding="utf-8", newline="") as fh:
            fh.write(out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
