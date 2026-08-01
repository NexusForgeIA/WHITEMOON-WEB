#!/usr/bin/env python3
"""SEO Guardian — auditoría automática de SEO/GEO para whitemoon.es.

Revisa todos los archivos HTML del repositorio, valida una serie de checks
SEO/estructurales y genera el informe `seo-guardian-report.md`. Envía el
resultado (verde/rojo) como notificación por Telegram vía la Bot API.

Dependencias: beautifulsoup4, requests.
"""

import json
import os
import re
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup, Comment

# ── Configuración ──────────────────────────────────────────────────────────
BASE_URL = "https://whitemoon.es"
REPORT_FILE = "seo-guardian-report.md"

# Directorios que son redirects (meta-refresh), no páginas reales.
IGNORED_DIRS = {
    "scale", "elite", "orion-calls", "auditoria-ia",
    # Antiguas URLs que ahora redirigen a su slug canónico.
    "chatbot-abogados-madrid",
    "chatbot-clinicas-dentales-madrid",
    "chatbot-ia-abogados-madrid",
    "chatbot-peluquerias-madrid",
    "chatbot-talleres-mecanicos-madrid",
    # URLs con 404 en Search Console reconvertidas en stubs meta-refresh.
    "chatbot-ia-abogados-majadahonda",
    "n8n-claude-api-automatizacion",
}
# Archivos individuales a ignorar (stub de Google Search Console).
IGNORED_FILES = {"google0f366eade019ef7a.html"}
# Páginas que legítimamente no van en el sitemap (solo para el check 10 inverso).
SKIP_SITEMAP_FILES = {"404.html"}

# Precios incorrectos / obsoletos a vigilar en texto visible.
# 4.500€/8.500€ = packs Scale/Elite retirados.
# 2.899€/1.800€/3.200€/999€ = precios de packs anteriores a la tarifa 2026
# (Core Orion, Core Spark Web, Core RAG, Orion IA Agent). 1.499€ ya NO es
# obsoleto: es el nuevo setup de Core Orion.
BAD_PRICES = ["4.500€", "8.500€", "2.899€", "1.800€", "3.200€", "999€"]
# El check 8 solo aplica a páginas de packs / precios: ahí un precio obsoleto
# es un error real. En las calculadoras estas cifras son ejemplos legítimos.
PACK_PAGES = {
    "index.html",
    "precios/index.html",
    "spark/index.html",
    "orion-agent/index.html",
    "core/index.html",
    "core-rag/index.html",
    "auditoria-ia/index.html",
    "servicios/index.html",
    "white-moon-system/index.html",
    "orion/index.html",
}
# Productos retirados (texto visible, case-sensitive para evitar falsos positivos).
# Los checks 9 y 13 ya recorren el texto visible de TODAS las páginas, /blog/
# incluido: para retirar un producto basta con añadirlo aquí.
#
# "Gestoría IA" va capitalizado a propósito. En minúscula ("autónomos con
# gestoría IA…") es prosa descriptiva legítima, no una mención al pack.
RETIRED_PRODUCTS = {
    "Orion IA Calls": re.compile(r"Orion\s+IA\s+Calls"),
    "Scale": re.compile(r"\bScale\b"),
    "Elite": re.compile(r"\bElite\b"),
    "Orbit": re.compile(r"\bOrbit\b"),
    "Gestoría IA": re.compile(r"\bGestor[ií]a\s+IA\b"),
}
# Alias retrocompatible: el nombre viejo seguía usándose en scripts externos.
RETIRED_PATTERNS = RETIRED_PRODUCTS
# Prefijos exentos del check 9: líneas de producto distintas donde los nombres
# de packs retirados son legítimos. Sin exenciones activas.
RETIRED_EXEMPT_PREFIXES = ()

# ── Check 15 · reseñas en datos estructurados ──────────────────────────────
# Las 30 páginas de zona de /reformas-madrid/ llevaron durante meses un
# aggregateRating de 5 estrellas con 47 reseñas que no existían: dato inventado
# en el sitio, servido a Google, y contra sus propias políticas de reseñas.
# Este check lo bloquea de raíz.
#
# La allowlist está vacía a propósito. Para meter una página hay que poder
# enseñar de dónde salen las reseñas (perfil de Google Business, plataforma con
# enlace público) y que el número case con la fuente. Si no se puede enseñar,
# no se publica.
RATING_RX = re.compile(r'"(aggregateRating|ratingValue|reviewCount|ratingCount)"')
RATING_APPROVED = frozenset()


# ── Check 13 · precios muertos en la prosa ─────────────────────────────────
# El check 8 solo mira las 10 páginas de PACK_PAGES. El 13 recorre TODAS las
# páginas (blog incluido), que es por donde se colaron los tramos inventados
# de 4.500/8.500€ de setup y las cuotas de 249/449€/mes.
CATALOG_FILE = "precios/index.html"

# Número COMPLETO: los lookarounds impiden que 999 case dentro de 5.999 o que
# 4.500 case dentro de 14.500 — el falso positivo que más ruido daba.
NUMBER_RX = re.compile(r"(?<![\d.,])(\d{1,3}(?:\.\d{3})+|\d+)(?![\d.,]*\d)")
# El número va acompañado de € o de una palabra que lo convierte en precio.
PRICE_CONTEXT_RX = re.compile(
    r"€|\bEUR\b|\bsetup\b|/\s*mes|\bal mes\b|\bdesde\b|\bprecio|\bcuota|\btarifa"
    r"|\bpago único\b|\binversión\b|\bmantenimiento\b",
    re.I,
)
# Señal FUERTE de que la cifra es el precio de un pack nuestro → crítico.
# Deliberadamente NO incluye "/mes" ni "cuota": un sueldo de 1.800€/mes en una
# calculadora los dispara, y la regla es que la ambigüedad sea warning.
PACK_STRONG_RX = re.compile(
    r"\bsetup\b|\bpermanencia\b|\bpack\b|\bplan(es)?\b|\btarifa"
    r"|\bSpark\b|\bOrion\b|\bCore\b|\bMini Core\b|\bWhiteMoon\b|\bRAG\b",
    re.I,
)
# Veto de la allowlist: solo un nombre de pack PEGADO a la cifra la levanta.
# Se mira en una ventana estrecha a propósito — con la ventana ancha, un
# "Setup amortizado en 1-3 meses" de la frase siguiente levantaba el permiso
# de un "recupera 1.800-2.400€" que no es un precio.
PACK_NAME_RX = re.compile(
    r"\bSpark\b|\bOrion\b|\bCore\b|\bMini Core\b|\bWhiteMoon\b|\bRAG\b"
    r"|\bpack\b|\bplan(es)?\b",
    re.I,
)
VETO_BEFORE, VETO_AFTER = 35, 20

# Falsos positivos ya documentados por el barrido manual. Si la página y el
# valor encajan (y el contexto, cuando se exige), no se marca.
#
# Excepción: la allowlist NUNCA tapa una cifra que lleve al lado el nombre de
# un pack. Así una calculadora puede seguir usando 4.500€ como deducción de
# IRPF, pero si alguien escribe "Spark 4.500€ setup" en esa misma página, salta.
PRICE_ALLOWLIST = (
    {
        # Las calculadoras son herramientas fiscales/ROI: estas cifras son
        # importes de ejemplo (deducción por hijo, coste de un empleado…).
        "paths": ("calculadora-",),
        "prices": {4500, 8500, 1800, 3200, 2899, 999},
        "context": None,
        "motivo": "cifra fiscal/laboral de ejemplo, no un precio de pack",
    },
    {
        "paths": ("automatizaciones/",),
        "prices": {999, 2899, 3200, 4500, 8500, 1800},
        "context": None,
        "motivo": "catálogo Esencial/GestoTrafic, línea de producto distinta",
    },
)


# ── Utilidades de rutas ────────────────────────────────────────────────────
def is_ignored(relpath):
    """True si el archivo está en un directorio de redirect o es un stub ignorado."""
    parts = relpath.replace("\\", "/").split("/")
    if any(p in IGNORED_DIRS for p in parts):
        return True
    if parts[-1] in IGNORED_FILES:
        return True
    return False


def find_html_files():
    """Devuelve la lista de archivos HTML relevantes (rutas relativas, posix)."""
    files = []
    for root, dirs, names in os.walk("."):
        # No descender en directorios ocultos (.git, .github, .agents, etc.):
        # no son páginas del sitio.
        dirs[:] = [d for d in dirs if not d.startswith(".")]
        for name in names:
            if not name.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(root, name), ".").replace("\\", "/")
            if is_ignored(rel):
                continue
            files.append(rel)
    return sorted(files)


def file_to_url(relpath):
    """Convierte una ruta de archivo en su URL canónica."""
    p = relpath.replace("\\", "/")
    if p == "index.html":
        return f"{BASE_URL}/"
    if p.endswith("/index.html"):
        return f"{BASE_URL}/" + p[: -len("index.html")]
    return f"{BASE_URL}/" + p


def url_to_file(loc):
    """Convierte una URL del sitemap en la ruta de archivo esperada."""
    path = loc.strip()
    for prefix in ("https://whitemoon.es", "http://whitemoon.es"):
        if path.startswith(prefix):
            path = path[len(prefix):]
            break
    path = path.split("#")[0].split("?")[0]
    if path.startswith("/"):
        path = path[1:]
    if path == "":
        return "index.html"
    if path.endswith("/"):
        return path + "index.html"
    if path.endswith(".html"):
        return path
    return path + "/index.html"


# ── Carga de archivos ──────────────────────────────────────────────────────
def read_text(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except (OSError, UnicodeDecodeError):
        try:
            with open(path, encoding="latin-1") as fh:
                return fh.read()
        except OSError:
            return ""


def sitemap_locs():
    raw = read_text("sitemap.xml")
    if not raw:
        return []
    return re.findall(r"<loc>\s*([^<]+?)\s*</loc>", raw)


# ── Precios vigentes (leídos del catálogo, no hardcodeados) ────────────────
def normalize_price(raw):
    """'4.500' → 4500. None si no es un entero limpio."""
    txt = str(raw).replace(".", "").replace("€", "").strip()
    return int(txt) if txt.isdigit() else None


def _collect_prices(node, out):
    """Recoge precios de un OfferCatalog: campos `price` y cifras con € en los textos."""
    if isinstance(node, dict):
        for key, value in node.items():
            if key == "price" and isinstance(value, (str, int, float)):
                val = normalize_price(value)
                if val is not None:
                    out.add(val)
            elif isinstance(value, str):
                for m in re.finditer(r"(\d{1,3}(?:\.\d{3})+|\d+)\s*€", value):
                    val = normalize_price(m.group(1))
                    if val is not None:
                        out.add(val)
            else:
                _collect_prices(value, out)
    elif isinstance(node, list):
        for item in node:
            _collect_prices(item, out)


def catalog_prices():
    """Precios vigentes del OfferCatalog de /precios/ (setup y cuotas).

    Se leen del catálogo para que el check no se quede viejo: si un día un
    precio de BAD_PRICES vuelve a la tarifa, deja de marcarse solo.
    """
    html = read_text(CATALOG_FILE)
    prices = set()
    if not html:
        return prices
    for payload in re.findall(
        r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', html, re.S
    ):
        if "OfferCatalog" not in payload:
            continue
        try:
            _collect_prices(json.loads(payload), prices)
        except (ValueError, json.JSONDecodeError):
            continue
    return prices


def price_allowlisted(relpath, value, context):
    """Motivo por el que esta cifra está permitida en esta página, o None."""
    for rule in PRICE_ALLOWLIST:
        if not relpath.startswith(rule["paths"]):
            continue
        if value not in rule["prices"]:
            continue
        rx = rule["context"]
        if rx is None or rx.search(context):
            return rule["motivo"]
    return None


def scan_dead_prices(relpath, text, dead_values):
    """Busca precios retirados usados COMO precio. Devuelve (criticos, warnings)."""
    criticos, warnings = [], []
    for m in NUMBER_RX.finditer(text):
        value = normalize_price(m.group(1))
        if value is None or value not in dead_values:
            continue
        before = text[max(0, m.start() - 70):m.start()]
        after = text[m.end():m.end() + 30]
        # ¿Es un precio, o solo un número suelto?
        if not (re.match(r"\s*(€|EUR\b)", after) or PRICE_CONTEXT_RX.search(before + " " + after)):
            continue
        context = before + " " + after
        strong = PACK_STRONG_RX.search(context)
        # La allowlist no tapa una cifra que lleve un nombre de pack PEGADO.
        near = text[max(0, m.start() - VETO_BEFORE):m.start()] + " " + text[m.end():m.end() + VETO_AFTER]
        if not PACK_NAME_RX.search(near) and price_allowlisted(relpath, value, context):
            continue
        snippet = " ".join((before[-45:] + m.group(0) + after[:20]).split())
        entry = f"`{relpath}` — {m.group(1)}€ en «…{snippet}…»"
        if strong:
            criticos.append(entry)
        else:
            warnings.append(entry)
    return criticos, warnings


# ── Ejecución de checks ────────────────────────────────────────────────────
def run_checks():
    """Ejecuta todos los checks y devuelve un dict {num: {"title","sev","items"}}."""
    checks = {
        1: {"title": "title ≤ 65 caracteres", "sev": "critico", "items": []},
        2: {"title": "meta description ≤ 160 caracteres", "sev": "critico", "items": []},
        3: {"title": "JSON-LD válido", "sev": "critico", "items": []},
        4: {"title": "og:image en JPG/PNG (no SVG)", "sev": "critico", "items": []},
        5: {"title": "H1 único por página", "sev": "critico", "items": []},
        6: {"title": "Imágenes sin atributo alt", "sev": "critico", "items": []},
        7: {"title": "Imágenes sin width o height", "sev": "critico", "items": []},
        8: {"title": "Precios incorrectos en páginas de packs", "sev": "critico", "items": []},
        9: {"title": "Productos retirados en texto visible", "sev": "critico", "items": []},
        10: {"title": "Sitemap vs archivos físicos", "sev": "warning", "items": []},
        11: {"title": "Enlaces rotos en llms.txt (URLs sin archivo físico)", "sev": "critico", "items": []},
        12: {"title": "FAQPage en JSON-LD sin DOM visible", "sev": "warning", "items": []},
        13: {"title": "Precios retirados en texto visible (todas las páginas)", "sev": "critico", "items": []},
        14: {"title": "Cifras ambiguas que podrían ser precios retirados", "sev": "warning", "items": []},
        15: {"title": "Reseñas en datos estructurados sin fuente aprobada", "sev": "critico", "items": []},
    }

    html_files = find_html_files()

    # Precios muertos efectivos = BAD_PRICES que NO estén en el catálogo vigente.
    vigentes = catalog_prices()
    dead_values = {
        v for v in (normalize_price(p) for p in BAD_PRICES)
        if v is not None and v not in vigentes
    }

    for relpath in html_files:
        html = read_text(relpath)
        if not html.strip():
            continue
        soup = BeautifulSoup(html, "html.parser")

        # 1 · title ≤ 65
        title = soup.title
        if title and title.string:
            t = title.string.strip()
            if len(t) > 65:
                checks[1]["items"].append(f"`{relpath}` — {len(t)} chars: \"{t[:70]}…\"")

        # 2 · meta description ≤ 160
        md = soup.find("meta", attrs={"name": "description"})
        if md and md.get("content"):
            desc = md["content"].strip()
            if len(desc) > 160:
                checks[2]["items"].append(f"`{relpath}` — {len(desc)} chars")

        # 3 · JSON-LD válido
        for i, script in enumerate(soup.find_all("script", attrs={"type": "application/ld+json"})):
            payload = script.string or script.get_text()
            if not payload or not payload.strip():
                checks[3]["items"].append(f"`{relpath}` — bloque JSON-LD #{i + 1} vacío")
                continue
            try:
                json.loads(payload)
            except (ValueError, json.JSONDecodeError) as exc:
                checks[3]["items"].append(f"`{relpath}` — bloque JSON-LD #{i + 1}: {exc}")

        # 15 · reseñas en datos estructurados: solo con fuente aprobada
        if relpath not in RATING_APPROVED:
            claves = sorted(set(m.group(1) for m in RATING_RX.finditer(html)))
            if claves:
                checks[15]["items"].append(
                    f"`{relpath}` — {', '.join(claves)} sin fuente aprobada. "
                    "Si las reseñas son reales, añade el archivo a RATING_APPROVED "
                    "indicando de dónde salen; si no, quita el bloque."
                )

        # 4 · og:image SVG
        og = soup.find("meta", attrs={"property": "og:image"})
        if og and og.get("content"):
            src = og["content"].strip().lower()
            if src.endswith(".svg") or ".svg" in src.split("?")[0]:
                checks[4]["items"].append(f"`{relpath}` — og:image es SVG: {og['content']}")

        # 5 · H1 único
        h1s = soup.find_all("h1")
        if len(h1s) != 1:
            checks[5]["items"].append(f"`{relpath}` — {len(h1s)} H1 encontrados")

        # 6 · imágenes sin alt
        no_alt = [img for img in soup.find_all("img") if not img.has_attr("alt")]
        if no_alt:
            checks[6]["items"].append(f"`{relpath}` — {len(no_alt)} imagen(es) sin alt")

        # 7 · imágenes sin width o height
        no_dim = [
            img for img in soup.find_all("img")
            if not img.has_attr("width") or not img.has_attr("height")
        ]
        if no_dim:
            checks[7]["items"].append(f"`{relpath}` — {len(no_dim)} imagen(es) sin width/height")

        # Texto visible (sin comentarios, sin <script>/<style>).
        for tag in soup(["script", "style"]):
            tag.extract()
        for comment in soup.find_all(string=lambda x: isinstance(x, Comment)):
            comment.extract()
        visible_text = soup.get_text(separator=" ")

        # 8 · precios incorrectos (solo en páginas de packs/precios)
        if relpath in PACK_PAGES:
            found_prices = [p for p in BAD_PRICES if p in visible_text]
            if found_prices:
                checks[8]["items"].append(f"`{relpath}` — {', '.join(found_prices)}")

        # 9 · productos retirados (omitiendo líneas de producto exentas)
        if relpath.startswith(RETIRED_EXEMPT_PREFIXES):
            found_retired = []
        else:
            found_retired = [name for name, rx in RETIRED_PRODUCTS.items() if rx.search(visible_text)]
        if found_retired:
            checks[9]["items"].append(f"`{relpath}` — {', '.join(found_retired)}")

        # 13/14 · precios retirados en la prosa de CUALQUIER página
        criticos, warns = scan_dead_prices(relpath, visible_text, dead_values)
        checks[13]["items"].extend(criticos)
        checks[14]["items"].extend(warns)

        # 12 · FAQPage sin DOM (reutiliza el soup sin script/style; re-parseamos para JSON-LD)
        if re.search(r'"@type"\s*:\s*("FAQPage"|\[[^\]]*"FAQPage")', html):
            dom = BeautifulSoup(html, "html.parser")
            has_dom = bool(
                dom.select("details")
                or dom.select('[class*="faq"]')
                or dom.select('[itemtype*="Question"]')
            )
            if not has_dom:
                checks[12]["items"].append(f"`{relpath}` — FAQPage en schema sin acordeón/DOM visible")

    # 10 · Sitemap vs archivos físicos
    locs = sitemap_locs()
    file_set = set(html_files)
    sitemap_files = set()
    for loc in locs:
        expected = url_to_file(loc)
        sitemap_files.add(expected)
        if expected not in file_set and not os.path.exists(expected):
            checks[10]["items"].append(f"URL en sitemap sin archivo: {loc} → `{expected}`")

    sitemap_url_set = {loc.rstrip("/") + "/" if not loc.endswith(".html") else loc for loc in locs}
    for relpath in html_files:
        if relpath.split("/")[-1] in SKIP_SITEMAP_FILES:
            continue
        # Las páginas noindex (landings de captación, etc.) no deben estar en el
        # sitemap: las excluimos para no generar un warning falso.
        if re.search(r'name=["\']robots["\'][^>]*noindex', read_text(relpath), re.I):
            continue
        url = file_to_url(relpath)
        norm = url if url.endswith(".html") else url.rstrip("/") + "/"
        if norm not in sitemap_url_set:
            checks[10]["items"].append(f"Archivo sin URL en sitemap: `{relpath}` → {url}")

    # 11 · Enlaces rotos en llms.txt — URLs listadas que ya no existen en el repo.
    # (Antes: URLs del sitemap ausentes en llms.txt → generaba ~150 warnings por
    #  URLs que deliberadamente no se listan. Invertido para detectar lo realmente
    #  problemático: enlaces muertos servidos a los LLMs.)
    llms = read_text("llms.txt")
    if llms:
        seen = set()
        for url in re.findall(r"https?://whitemoon\.es[^\s\"'<>)]*", llms):
            url = url.rstrip(".,);:")
            if url in seen:
                continue
            seen.add(url)
            expected = url_to_file(url)
            if not os.path.exists(expected):
                checks[11]["items"].append(f"URL en llms.txt sin archivo: {url} → `{expected}`")
    else:
        checks[11]["items"].append("No se encontró llms.txt")

    return checks


# ── Informe ────────────────────────────────────────────────────────────────
def build_report(checks, fecha):
    critical = sum(len(c["items"]) for n, c in checks.items() if c["sev"] == "critico")
    warnings = sum(len(c["items"]) for n, c in checks.items() if c["sev"] == "warning")

    lines = []
    lines.append("# 🛡️ SEO Guardian — Informe")
    lines.append("")
    lines.append(f"**Fecha de ejecución:** {fecha} (Europe/Madrid)")
    lines.append("")
    lines.append("## Resumen")
    lines.append("")
    lines.append(f"- 🔴 **{critical}** errores críticos")
    lines.append(f"- 🟡 **{warnings}** warnings")
    lines.append("")

    if critical == 0 and warnings == 0:
        lines.append("## ✅ TODO OK")
        lines.append("")
        lines.append(f"No se han detectado incidencias en ninguno de los {len(checks)} checks.")
        lines.append("")
        return "\n".join(lines), critical, warnings

    lines.append("## Detalle por check")
    lines.append("")
    for num in sorted(checks):
        c = checks[num]
        icon = "🔴" if c["sev"] == "critico" else "🟡"
        lines.append(f"### {icon} Check {num} — {c['title']}")
        if c["items"]:
            lines.append("")
            for item in c["items"]:
                lines.append(f"- {item}")
            lines.append("")
        else:
            lines.append("")
            lines.append("✅ Sin incidencias.")
            lines.append("")

    return "\n".join(lines), critical, warnings


# ── Notificación Telegram ──────────────────────────────────────────────────
def notify_telegram(critical, fecha):
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        print("TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID no configurados; se omite la notificación.")
        return

    if critical > 0:
        text = (
            f"🔴 SEO Guardian whitemoon.es — {critical} errores críticos detectados "
            f"el {fecha}. Revisa el report en GitHub Actions."
        )
    else:
        text = f"✅ SEO Guardian whitemoon.es — Todo correcto el {fecha}."

    try:
        resp = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text},
            timeout=30,
        )
        print(f"Notificación Telegram enviada (HTTP {resp.status_code}): {resp.text}")
    except requests.RequestException as exc:
        print(f"Error al enviar la notificación Telegram: {exc}")


# ── Main ───────────────────────────────────────────────────────────────────
def main():
    try:
        from zoneinfo import ZoneInfo
        now = datetime.now(ZoneInfo("Europe/Madrid"))
    except Exception:  # noqa: BLE001 — fallback si no hay tzdata
        now = datetime.now(timezone.utc)
    fecha = now.strftime("%d/%m/%Y %H:%M")

    checks = run_checks()
    report, critical, warnings = build_report(checks, fecha)

    with open(REPORT_FILE, "w", encoding="utf-8") as fh:
        fh.write(report)

    print(f"Informe generado: {REPORT_FILE}")
    print(f"Errores críticos: {critical} · Warnings: {warnings}")

    notify_telegram(critical, fecha)


if __name__ == "__main__":
    main()
