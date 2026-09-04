#!/usr/bin/env python3
"""Aplica la navbar unificada de WhiteMoon al header de todas las paginas de paseo.

Menu resultante:  Servicios (desplegable corto) · Demos · Precios · Recursos
                  + un unico CTA: "Auditoria GEO/SEO Gratis".
"Agendar reunion" baja a enlace de texto secundario.

Lo que sale del top (Nosotros, Blog, Casos y los 8 enlaces del mega-desplegable
"Soluciones") entra en el bloque .wm-fnav del footer, que este script inyecta en
las paginas cuyo footer es la barra minima de copyright. NINGUNA URL cambia:
esto es jerarquia de navegacion, no arquitectura de contenido.

Universo (casta 1 del repo: paginas de paseo con menu real, >=2 destinos
internos en el <nav>). Quedan fuera, por la regla ya fijada del repo:
  · las landings de conversion (nav minimo intencional),
  · el microsite reformas-madrid,
  · los micrositios con nav de anclas propias (EXCLUDE).

Uso:
    python scripts/nav_rebuild.py --check    # no escribe, solo informa
    python scripts/nav_rebuild.py
"""
from __future__ import annotations

import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSET_V = "2026090401"

SKIP_DIRS = {
    ".git", ".github", ".claude", ".agents", "__pycache__", "node_modules",
    "assets", "supabase", "outputs", "reformas-madrid", ".well-known",
}

# Micrositios / landings con navegacion de anclas propia. Su <nav> es indice de
# secciones de la propia pagina, no el menu del sitio: sustituirlo se los cargaria.
EXCLUDE = {
    "electricistas-madrid/index.html",   # microsite de cliente
    "gestotrafic/index.html",            # microsite de producto
    "automatizaciones/index.html",       # landing WhiteMoon 360, nav de anclas
}

# Paginas cuyo header vivia en el flujo del documento (sticky). Ahi la navbar
# tiene que seguir siendo sticky: si pasa a fixed, tapa el primer bloque.
FLOW_PAGES_EXTRA = {"blog/index.html", "demos/index.html", "pack-ads/index.html"}

NAV_RX = re.compile(r"<nav\b[^>]*>.*?</nav>", re.S | re.I)
FOOTER_OPEN_RX = re.compile(r"<footer\b[^>]*>", re.I)

CARET = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
         'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
         '<polyline points="6 9 12 15 18 9"/></svg>')
ARROW = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
         'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
         '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>')
BURGER = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
          '<line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/>'
          '<line x1="3" y1="17" x2="21" y2="17"/></svg>')
CLOSE = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
         'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
         '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>')

HEAD_CSS = '<link rel="stylesheet" href="/assets/wm-nav.css?v=%s">' % ASSET_V
HEAD_JS = '<script defer src="/assets/wm-nav.js?v=%s"></script>' % ASSET_V
# Se borra la linea entera (asi una segunda pasada deja el fichero identico).
WM_HEAD_RX = re.compile(
    r'^[ \t]*<link rel="stylesheet" href="/assets/wm-nav\.css[^"]*">[ \t]*\r?\n'
    r'|^[ \t]*<script defer src="/assets/wm-nav\.js[^"]*"></script>[ \t]*\r?\n',
    re.M,
)
LAST_SHEET_RX = re.compile(r'<link[^>]+rel=["\']stylesheet["\'][^>]*>', re.I)


def nav_html(flow: bool) -> str:
    cls = "wm-nav wm-nav--flow" if flow else "wm-nav"
    return f"""<!-- WM-NAV · navbar unificada · markup generado por scripts/nav_rebuild.py -->
<nav class="{cls}" aria-label="Navegación principal">
  <div class="wm-nav__row">
    <a class="wm-nav__logo" href="/">
      <img src="/assets/images/icono-44.webp" srcset="/assets/images/icono-44.webp 1x, /assets/images/icono-80.webp 2x" alt="WhiteMoon" width="28" height="28" loading="eager" decoding="async">
      <span><span class="wm-l">WHITE</span><span class="wm-a">MOON</span></span>
    </a>

    <div class="wm-nav__center">
      <div class="wm-nav__dd" aria-expanded="false">
        <button type="button" aria-haspopup="true" aria-expanded="false">Servicios{CARET}</button>
        <div class="wm-nav__menu" role="menu">
          <a href="/orion/" role="menuitem">Orion IA<span class="desc">Agente de voz en tu web, 24/7</span></a>
          <a href="/servicios/" class="wm-nav__all" role="menuitem">Ver todos los servicios →</a>
        </div>
      </div>
      <a href="/demos/">Demos</a>
      <a href="/precios/">Precios</a>
      <a href="/recursos/">Recursos</a>
    </div>

    <div class="wm-nav__right">
      <a class="wm-nav__meet" href="https://cal.com/whitemoon" target="_blank" rel="noopener">Agendar reunión</a>
      <a class="wm-nav__cta" href="/auditoria-geo-seo/">
        <span class="wm-long">Auditoría GEO/SEO Gratis</span><span class="wm-short">Auditoría gratis</span>{ARROW}
      </a>
      <button class="wm-nav__burger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="wmDrawer">{BURGER}</button>
    </div>
  </div>
</nav>
<aside class="wm-drawer" id="wmDrawer" aria-hidden="true">
  <button class="wm-drawer__close" type="button" aria-label="Cerrar menú">{CLOSE}</button>
  <a class="wm-drawer__link" href="/servicios/">Servicios</a>
  <a class="wm-drawer__link" href="/demos/">Demos</a>
  <a class="wm-drawer__link" href="/precios/">Precios</a>
  <a class="wm-drawer__link" href="/recursos/">Recursos</a>
  <a class="wm-drawer__meet" href="https://cal.com/whitemoon" target="_blank" rel="noopener">Agendar reunión</a>
  <a class="wm-drawer__cta" href="/auditoria-geo-seo/">Auditoría GEO/SEO Gratis{ARROW}</a>
</aside>"""


# Bloque de footer: aqui aterriza todo lo que ya no esta en el top.
FOOTER_NAV = """
  <div class="wm-fnav">
    <div>
      <h2>Servicios</h2>
      <ul>
        <li><a href="/white-moon-system/">WhiteMoon System</a></li>
        <li><a href="/orion/">Orion IA</a></li>
        <li><a href="/automatizacion-ventas/">Automatización de ventas</a></li>
        <li><a href="/atencion-cliente-ia/">Atención al cliente IA</a></li>
        <li><a href="/costes-eficiencia-empresarial-ia/">Reducción de costes</a></li>
        <li><a href="/coste-no-automatizar/">Coste de no automatizar</a></li>
        <li><a href="/auditoria-geo-ia/">Auditoría GEO IA</a></li>
        <li><a href="/automatizaciones/">Automatizaciones</a></li>
        <li><a href="/servicios/">Ver todos los servicios</a></li>
      </ul>
    </div>
    <div>
      <h2>Recursos</h2>
      <ul>
        <li><a href="/demos/">Demos</a></li>
        <li><a href="/precios/">Precios</a></li>
        <li><a href="/recursos/">Calculadoras</a></li>
        <li><a href="/prompts-ia-pymes/">Prompts de IA para pymes</a></li>
        <li><a href="/casos/">Casos de uso</a></li>
        <li><a href="/blog/">Blog</a></li>
      </ul>
    </div>
    <div>
      <h2>WhiteMoon</h2>
      <ul>
        <li><a href="/sobre-nosotros/">Sobre nosotros</a></li>
        <li><a href="/auditoria-geo-seo/">Auditoría GEO/SEO gratis</a></li>
        <li><a href="https://cal.com/whitemoon" target="_blank" rel="noopener">Agendar reunión</a></li>
        <li><a href="https://wa.me/34643199580" target="_blank" rel="noopener">WhatsApp · 643 199 580</a></li>
        <li><!--email_off--><a href="mailto:comercial@whitemoon.es">comercial@whitemoon.es</a><!--/email_off--></li>
      </ul>
    </div>
  </div>
"""


# ── "Agendar reunion" fuera de las paginas de paseo ────────────────────────
# Las landings de conversion conservan su barra minima (regla del repo), pero
# llevaban el boton morado de cal.com compitiendo con su propio CTA. Aqui solo
# se le quita el aspecto de boton: mismo href, misma clase (para que sigan
# valiendo los `@media` que lo ocultan en movil) y mismo sitio.
CAL_BTN_RX = re.compile(
    r'<a\b[^>]*href="https://cal\.com/whitemoon"[^>]*class="nav-cta-cal"[^>]*>.*?</a>', re.S
)
CAL_LINK = (
    '<a href="https://cal.com/whitemoon" target="_blank" rel="noopener" class="nav-cta-cal" '
    'style="font-size:.82rem;font-weight:500;color:#9CA3AF;text-decoration:none;'
    'white-space:nowrap;margin-right:8px;padding:6px 2px;border-bottom:1px solid transparent;'
    'transition:color .15s,border-color .15s" '
    'onmouseover="this.style.color=\'#E8E8F0\';this.style.borderBottomColor=\'rgba(157,112,255,.6)\'" '
    'onmouseout="this.style.color=\'#9CA3AF\';this.style.borderBottomColor=\'transparent\'"'
    '>Agendar reunión</a>'
)


def read(path: str) -> str:
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def write(path: str, text: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)


def menu_destinations(nav: str) -> set[str]:
    """Destinos internos del menu, normalizando relativo / raiz / dominio."""
    dests = set()
    for href, inner in re.findall(
        r'<a\b[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', nav, re.S | re.I
    ):
        low = inner.lower()
        if "<img" in low or "<picture" in low:      # ancla del logo
            continue
        h = re.sub(r"^https?://(www\.)?whitemoon\.es", "", href.strip())
        if h.startswith("/") or h.startswith("#"):
            dests.add(h)
    return dests


def target_pages() -> list[str]:
    """Casta 1: paginas con menu real (>=2 destinos internos en el <nav>)."""
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in sorted(filenames):
            if not name.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, "/")
            if rel in EXCLUDE:
                continue
            html = read(os.path.join(ROOT, rel))
            nav = NAV_RX.search(html)
            if not nav:
                continue
            if "wm-nav__row" in html or len(menu_destinations(nav.group(0))) >= 2:
                out.append(rel)
    return sorted(out)


def is_flow(rel: str, html: str) -> bool:
    if rel in FLOW_PAGES_EXTRA or rel.startswith("blog/"):
        return True
    nav_tag = re.search(r"<nav\b[^>]*>", html, re.I)
    return bool(nav_tag and re.search(r"position\s*:\s*sticky", nav_tag.group(0), re.I))


def ensure_head(html: str) -> str:
    """Enlaza la hoja y el script de la navbar.

    La hoja va JUNTO AL RESTO de <link rel=stylesheet>, nunca al final del
    <head>: si se colara despues de los <style> propios de la pagina, tumbaria
    sus ajustes locales de la barra (le paso a /precios/, que baja la navbar
    40px para dejar sitio a su banner fijo).
    """
    html = WM_HEAD_RX.sub("", html)
    head_end = html.lower().find("</head>")
    head = html[:head_end]
    # Rangos <noscript>…</noscript>: ahi dentro el <link> solo cargaria sin JS.
    blind = [(m.start(), m.end()) for m in re.finditer(r"<noscript\b.*?</noscript>", head, re.S | re.I)]

    def outside(pos):
        return all(not (a < pos < b) for a, b in blind)

    at = None
    first_style = re.search(r"<style\b", head, re.I)
    if first_style and outside(first_style.start()):
        # Al principio de la linea del primer <style>: la hoja tiene que cargar
        # antes que los estilos propios de la pagina, no despues.
        at = head.rfind("\n", 0, first_style.start()) + 1
    else:
        sheets = [m for m in LAST_SHEET_RX.finditer(head) if outside(m.end())]
        if sheets:                                    # tras el ultimo <link> util
            nl = head.find("\n", sheets[-1].end())
            at = head_end if nl == -1 else nl + 1
    if at is None:
        at = head_end
    html = html[:at] + HEAD_CSS + "\n" + html[at:]
    return re.sub(r"</head>", HEAD_JS + "\n</head>", html, count=1, flags=re.I)


def replace_nav(html: str, rel: str) -> str:
    block = nav_html(is_flow(rel, html))
    # Idempotencia: fuera lo que este script haya dejado en pasadas anteriores.
    # Sin esto cada ejecucion apilaba otro <aside class="wm-drawer">, porque la
    # sustitucion de abajo solo toca el <nav>.
    html = re.sub(r'^[ \t]*<!-- WM-NAV ·[^>]*-->[ \t]*\r?\n', "", html, flags=re.M)
    html = re.sub(r'\r?\n?<aside class="wm-drawer".*?</aside>', "", html, flags=re.S)
    # El home ademas arrastraba el cajon y la hoja de estilos del nav viejo.
    html = re.sub(r'<aside class="nav-drawer-ent".*?</aside>\s*', "", html, flags=re.S)
    html = re.sub(
        r"<!-- NAVBAR ENTERPRISE[^>]*-->\s*<style>\s*\.navbar\.nav-ent.*?</style>\s*",
        "", html, flags=re.S,
    )
    return NAV_RX.sub(lambda m: block, html, count=1)


def add_footer_nav(html: str) -> str:
    if "wm-fnav" in html:
        return html
    m = FOOTER_OPEN_RX.search(html)
    if not m:
        return html
    return html[: m.end()] + FOOTER_NAV + html[m.end():]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="no escribe, solo lista")
    args = ap.parse_args()

    pages = target_pages()
    page_set = set(pages)
    changed, no_footer, demoted = [], [], []

    # Paso 2 · el boton de cal.com deja de ser boton en el resto del sitio.
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in sorted(filenames):
            if not name.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, "/")
            if rel in page_set:
                continue
            path = os.path.join(ROOT, rel)
            before = read(path)
            after = CAL_BTN_RX.sub(lambda m: CAL_LINK, before)
            if after != before:
                demoted.append(rel)
                if not args.check:
                    write(path, after)

    for rel in pages:
        path = os.path.join(ROOT, rel)
        before = read(path)
        after = ensure_head(replace_nav(before, rel))
        # El home ya tiene un footer completo con columnas propias.
        if rel != "index.html":
            after = add_footer_nav(after)
            if "wm-fnav" not in after:
                no_footer.append(rel)
        if after != before:
            changed.append(rel)
            if not args.check:
                write(path, after)

    print(f"paginas en el universo : {len(pages)}")
    print(f"paginas modificadas    : {len(changed)}")
    print(f"boton cal.com degradado: {len(demoted)} landings")
    if no_footer:
        print(f"SIN <footer> (revisar) : {no_footer}")
    if args.check:
        print("(--check: no se ha escrito nada)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
