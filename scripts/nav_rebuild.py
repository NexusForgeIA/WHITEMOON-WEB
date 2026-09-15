#!/usr/bin/env python3
"""Aplica la navbar y el footer unificados de WhiteMoon a todas las paginas de paseo.

Menu resultante:  IA · Productos (desplegable: Spark · Core Spark Web) · Marketing ·
                  Contacto + un unico CTA: "Agendar reunion" (cal.com).

Footer: el de 5 columnas de la home (Marca · Servicios · Recursos · Comparativas
· Contacto + legales), identico en todo el universo. Su CSS vive en
assets/wm-nav.css: ningun <style> de pagina depende de la posicion del footer.

Universo (casta 1 del repo: paginas de paseo con menu real, >=2 destinos
internos en el <nav>). Quedan fuera, por la regla ya fijada del repo:
  · las landings de conversion (nav minimo intencional),
  · el microsite reformas-madrid,
  · los micrositios con nav de anclas propias y /precios/ (EXCLUDE).

Tras escribir, actualiza el <lastmod> del sitemap de las paginas modificadas.

Uso:
    python scripts/nav_rebuild.py --check    # no escribe, solo informa
    python scripts/nav_rebuild.py
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSET_V = "2026091501"

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
    # Se borra entera en su fase y se queda con el navbar y el footer viejos
    # hasta entonces. Por eso wm-nav.css y wm-nav.js conservan las reglas
    # antiguas (.wm-fnav, .wm-nav__meet, .wm-long/.wm-short).
    "precios/index.html",
}

# Paginas cuyo header vivia en el flujo del documento (sticky). Ahi la navbar
# tiene que seguir siendo sticky: si pasa a fixed, tapa el primer bloque.
FLOW_PAGES_EXTRA = {"blog/index.html", "demos/index.html"}

NAV_RX = re.compile(r"<nav\b[^>]*>.*?</nav>", re.S | re.I)

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

CAL = "https://cal.com/whitemoon"

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
      <a href="/inteligencia-artificial/">IA</a>
      <div class="wm-nav__dd" aria-expanded="false">
        <button type="button" aria-haspopup="true" aria-expanded="false">Productos{CARET}</button>
        <div class="wm-nav__menu" role="menu">
          <a href="/spark/" role="menuitem">Spark<span class="desc">Agente de IA para la web que ya tienes</span></a>
          <a href="/core/" role="menuitem">Core Spark Web<span class="desc">Web nueva con el agente de IA dentro</span></a>
        </div>
      </div>
      <a href="/marketing/">Marketing</a>
      <a href="/contacto/">Contacto</a>
    </div>

    <div class="wm-nav__right">
      <a class="wm-nav__cta" href="{CAL}" target="_blank" rel="noopener">Agendar reunión{ARROW}</a>
      <button class="wm-nav__burger" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="wmDrawer">{BURGER}</button>
    </div>
  </div>
</nav>
<aside class="wm-drawer" id="wmDrawer" aria-hidden="true">
  <button class="wm-drawer__close" type="button" aria-label="Cerrar menú">{CLOSE}</button>
  <a class="wm-drawer__link" href="/inteligencia-artificial/">IA</a>
  <span class="wm-drawer__label">Productos</span>
  <a class="wm-drawer__link" href="/spark/">Spark</a>
  <a class="wm-drawer__link" href="/core/">Core Spark Web</a>
  <a class="wm-drawer__link" href="/marketing/">Marketing</a>
  <a class="wm-drawer__link" href="/contacto/">Contacto</a>
  <a class="wm-drawer__cta" href="{CAL}" target="_blank" rel="noopener">Agendar reunión{ARROW}</a>
</aside>"""


# ── Footer unificado ────────────────────────────────────────────────────────
SOCIAL = [
    ("https://www.instagram.com/whitemoon_agencia_ia", "Instagram",
     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>'),
    ("https://www.tiktok.com/@whitemoon_ia", "TikTok",
     '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/></svg>'),
    ("https://wa.me/34643199580", "WhatsApp",
     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>'),
    ("https://www.linkedin.com/in/cristobal-martinez-8b9b9951", "LinkedIn",
     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>'),
    ("https://www.youtube.com/@whitemoonweb", "YouTube",
     '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2s-.2-1.6-.9-2.3c-.9-.9-1.9-.9-2.3-1C17.1 2.7 12 2.7 12 2.7s-5.1 0-8.3.2c-.4.1-1.4.1-2.3 1C.7 4.6.5 6.2.5 6.2S.3 8.1.3 10v1.8c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.3c.9.9 2 .9 2.5 1 1.8.2 7.1.2 7.1.2s5.1 0 8.3-.3c.4-.1 1.4-.1 2.3-1 .7-.7.9-2.3.9-2.3s.2-1.9.2-3.8V10c0-1.9-.2-3.8-.2-3.8zM9.7 13.5V7.9l6.2 2.8-6.2 2.8z"/></svg>'),
]
ICON_MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>'
ICON_WA = SOCIAL[2][2]
ICON_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>'
ICON_CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>'

FOOTER_COLS = [
    ("Servicios", [
        ("/spark/", "Spark"),
        ("/core/", "Core Spark Web"),
        ("/marketing/", "Marketing"),
    ]),
    ("Recursos", [
        ("/demos/", "Demos"),
        ("/costes-eficiencia-empresarial-ia/", "Calculadoras"),
        ("/prompts-ia-pymes/", "Prompts de IA para pymes"),
        ("/casos/", "Casos de uso"),
        ("/casos-de-exito/bambu-sushi/", "Caso real: Bambu Sushi"),
        ("/blog/", "Blog"),
        # Texto exacto a proposito: la canonica del termino es /agencia-ia-madrid/.
        ("/agencia-ia-madrid/", "Agencia de IA en Madrid"),
        ("/sobre-nosotros/", "Sobre nosotros"),
    ]),
    ("Comparativas", [
        ("/alternativa-flownexion/", "WhiteMoon vs Flownexion"),
        ("/alternativa-llmo/", "WhiteMoon vs Llmo"),
        ("/whitemoon-vs-intercom/", "WhiteMoon vs Intercom"),
        ("/whitemoon-vs-manychat/", "WhiteMoon vs ManyChat"),
        ("/whitemoon-vs-tidio/", "WhiteMoon vs Tidio"),
    ]),
]


def footer_html(with_id: bool) -> str:
    ident = ' id="contacto"' if with_id else ""
    social = "\n".join(
        f'        <a href="{href}" target="_blank" rel="noopener noreferrer" aria-label="{label}" title="{label}">{svg}</a>'
        for href, label, svg in SOCIAL
    )
    social += f'\n        <!--email_off--><a href="mailto:comercial@whitemoon.es" aria-label="Email" title="Email">{ICON_MAIL}</a><!--/email_off-->'
    cols = "\n\n".join(
        f'    <div>\n      <h3>{title}</h3>\n      <ul>\n'
        + "\n".join(f'        <li><a href="{href}">{text}</a></li>' for href, text in links)
        + "\n      </ul>\n    </div>"
        for title, links in FOOTER_COLS
    )
    return f"""<!-- WM-FOOT · footer unificado · markup generado por scripts/nav_rebuild.py -->
<footer{ident} class="wm-foot">
  <div class="wm-foot__grid">

    <div class="wm-foot__brand">
      <a href="/" class="wm-foot__logo" aria-label="WhiteMoon, inicio">
        <img src="/assets/images/icono-44.webp" srcset="/assets/images/icono-44.webp 1x, /assets/images/icono-80.webp 2x" alt="" width="32" height="32" loading="lazy" decoding="async">
        <span><span class="wm-l">WHITE</span><span class="wm-a">MOON</span></span>
      </a>
      <p>Webs con agente de IA, chatbots y automatización para pymes.<br>Operativo en días, sin permanencia.</p>
      <div class="wm-foot__social">
{social}
      </div>
    </div>

{cols}

    <div>
      <h3>Contacto</h3>
      <div class="wm-foot__contact">
        <div class="wm-foot__item">{ICON_MAIL}<div class="meta"><strong>Email</strong><!--email_off--><a href="mailto:comercial@whitemoon.es">comercial@whitemoon.es</a><!--/email_off--></div></div>
        <div class="wm-foot__item">{ICON_WA}<div class="meta"><strong>WhatsApp</strong><a href="https://wa.me/34643199580" target="_blank" rel="noopener">643 199 580</a></div></div>
        <div class="wm-foot__item">{ICON_PIN}<div class="meta"><strong>Dirección</strong>Calle Madrid 9, 2ºB<br>28220 Majadahonda, Madrid</div></div>
        <div class="wm-foot__item">{ICON_CLOCK}<div class="meta"><strong>Horario</strong>Lun-Vie 9:00 - 18:00</div></div>
      </div>
    </div>

  </div>

  <div class="wm-foot__bottom">
    <div>© <span id="yr">2026</span> WhiteMoon · Agencia de IA · Majadahonda, Madrid</div>
    <div class="wm-foot__legal">
      <a href="/aviso-legal/">Aviso Legal</a>
      <a href="/politica-privacidad/">Privacidad</a>
      <a href="/politica-cookies/">Cookies</a>
    </div>
    <div class="wm-foot__tag">Hecho por <img src="/assets/images/icono-44.webp" alt="" width="14" height="14" loading="lazy" decoding="async"> whitemoon.es</div>
  </div>
</footer>"""


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
    with open(path, encoding="utf-8", newline="") as fh:
        return fh.read()


def write(path: str, text: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)


def same_eol(before: str, after: str) -> str:
    """Los bloques se generan con \\n: en ficheros CRLF no se mezclan finales de linea."""
    if "\r\n" in before:
        return after.replace("\r\n", "\n").replace("\n", "\r\n")
    return after


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
    """Casta 1: paginas que ya llevan la navbar unificada (wm-nav__row).

    Antes tambien entraban las de >=2 destinos internos en el <nav>, pero ese
    censo arrastraba 52 landings de conversion (agencia-ia-*, comparativas,
    agentes-ia...) cuyo nav minimo es intencional: no se tocan en barridos.
    Una pagina de paseo nueva nace ya con el esqueleto wm-nav y entra sola.
    """
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
            if "wm-nav__row" in html:
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


# Zonas donde un "<footer" NO es una etiqueta: comentarios, <style> y <script>.
# /contacto/ menciona "<footer>" dentro de un comentario CSS; buscando a pelo,
# el corte empezaba ahi y se llevaba media hoja de estilos.
OPAQUE_RX = re.compile(r"<!--.*?-->|<style\b.*?</style>|<script\b.*?</script>", re.S | re.I)
# El <style> propio del footer de la home: su CSS vive ahora en wm-nav.css.
HOME_FOOT_STYLE_RX = re.compile(
    r"[ \t]*<!-- FOOTER -->\s*<!-- FOOTER ENTERPRISE[^>]*-->\s*<style>\s*footer#contacto\.foot-ent.*?</style>\s*",
    re.S,
)


def _visible(html: str) -> str:
    return OPAQUE_RX.sub(lambda m: " " * len(m.group(0)), html)


def replace_footer(html: str) -> str:
    html = HOME_FOOT_STYLE_RX.sub("", html)
    html = re.sub(r'^[ \t]*<!-- WM-FOOT ·[^>]*-->[ \t]*\r?\n', "", html, flags=re.M)
    vis = _visible(html)
    opens = list(re.finditer(r"<footer\b[^>]*>", vis, re.I))
    if not opens:
        return html
    start = opens[-1].start()
    end = vis.lower().find("</footer>", start)
    if end == -1:
        return html
    end += len("</footer>")
    # Si la pagina ya usa id="contacto" en su contenido, el footer va sin id.
    rest = vis[:start] + vis[end:]
    with_id = not re.search(r'\sid=["\']contacto["\']', rest)
    return html[:start] + footer_html(with_id) + html[end:]


def page_url(rel: str) -> str:
    if rel == "index.html":
        return "https://whitemoon.es/"
    return "https://whitemoon.es/" + rel[: -len("index.html")]


def touch_lastmod(rels: list[str], check: bool) -> list[str]:
    """Pone el <lastmod> de hoy a las paginas modificadas. Devuelve las que no estan."""
    path = os.path.join(ROOT, "sitemap.xml")
    sm = read(path)
    today = date.today().isoformat()
    missing = []
    for rel in rels:
        rx = re.compile(r"(<loc>%s</loc>\s*<lastmod>)[^<]*(</lastmod>)" % re.escape(page_url(rel)))
        sm, n = rx.subn(lambda m: m.group(1) + today + m.group(2), sm)
        if n != 1:
            missing.append(rel)
    if not check:
        write(path, sm)
    return missing


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="no escribe, solo lista")
    args = ap.parse_args()

    pages = target_pages()
    page_set = set(pages)
    changed, demoted = [], []

    # Paso 2 · el boton de cal.com deja de ser boton en el resto del sitio.
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in sorted(filenames):
            if not name.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, name), ROOT).replace(os.sep, "/")
            if rel in page_set or rel in EXCLUDE:
                continue
            path = os.path.join(ROOT, rel)
            before = read(path)
            after = CAL_BTN_RX.sub(lambda m: CAL_LINK, before)
            if after != before:
                demoted.append(rel)
                if not args.check:
                    write(path, after)

    no_footer = []
    for rel in pages:
        path = os.path.join(ROOT, rel)
        before = read(path)
        after = replace_footer(ensure_head(replace_nav(before, rel)))
        if 'class="wm-foot"' not in after:
            no_footer.append(rel)
        after = same_eol(before, after)
        if after != before:
            changed.append(rel)
            if not args.check:
                write(path, after)

    missing = touch_lastmod(changed, args.check) if changed else []

    print(f"paginas en el universo : {len(pages)}")
    print(f"paginas modificadas    : {len(changed)}")
    print(f"boton cal.com degradado: {len(demoted)} landings")
    if no_footer:
        print(f"SIN <footer> (revisar) : {no_footer}")
    if missing:
        print(f"sin <lastmod> en sitemap: {missing}")
    if args.check:
        print("(--check: no se ha escrito nada)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
