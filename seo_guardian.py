#!/usr/bin/env python3
"""SEO Guardian — auditoría automática de SEO/GEO para whitemoon.es.

Revisa todos los archivos HTML del repositorio, valida una serie de checks
SEO/estructurales y genera el informe `seo-guardian-report.md`. Si detecta
errores críticos (checks 1-9) envía una notificación por WhatsApp vía CallMeBot.

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
BAD_PRICES = ["4.500€", "8.500€", "1.499€"]
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
RETIRED_PATTERNS = {
    "Orion IA Calls": re.compile(r"Orion\s+IA\s+Calls"),
    "Scale": re.compile(r"\bScale\b"),
    "Elite": re.compile(r"\bElite\b"),
}
# Prefijos exentos del check 9: líneas de producto distintas donde los nombres
# de packs retirados son legítimos. Sin exenciones activas.
RETIRED_EXEMPT_PREFIXES = ()

PHONE = "34643199580"


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
    }

    html_files = find_html_files()

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
            found_retired = [name for name, rx in RETIRED_PATTERNS.items() if rx.search(visible_text)]
        if found_retired:
            checks[9]["items"].append(f"`{relpath}` — {', '.join(found_retired)}")

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
        lines.append("No se han detectado incidencias en ninguno de los 12 checks.")
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


# ── Notificación WhatsApp ──────────────────────────────────────────────────
def notify_whatsapp(critical, fecha):
    api_key = os.environ.get("CALLMEBOT_API_KEY")
    if not api_key:
        print("CALLMEBOT_API_KEY no configurada; se omite la notificación.")
        return

    if critical > 0:
        text = (
            f"🔴 SEO Guardian whitemoon.es — {critical} errores críticos detectados "
            f"el {fecha}. Revisa el report en GitHub Actions."
        )
    else:
        text = f"✅ SEO Guardian whitemoon.es — Todo correcto el {fecha}."

    try:
        resp = requests.get(
            "https://api.callmebot.com/whatsapp.php",
            params={"phone": PHONE, "text": text, "apikey": api_key},
            timeout=30,
        )
        print(f"Notificación WhatsApp enviada (HTTP {resp.status_code}).")
    except requests.RequestException as exc:
        print(f"Error al enviar la notificación WhatsApp: {exc}")


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

    notify_whatsapp(critical, fecha)


if __name__ == "__main__":
    main()
