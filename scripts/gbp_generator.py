#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generador de publicaciones para Google Business Profile (GBP) — WhiteMoon.

Enganchado al generador de blog: por CADA articulo recien publicado crea una
publicacion lista para copiar y pegar en Google Business Profile (formato
"novedad"), y la envia por Telegram al mismo chat que el blog.

NO usa la API de Google. NO inventa cifras, casos ni testimonios: el texto es
plantilla honesta que solo reutiliza el titulo real (H1) del articulo, su URL
y el sector/categoria del banco de temas.

Fuente de articulos (en este orden):
  1) scripts/last-run.json  -> lista 'published' (cuando corre tras el blog).
  2) scripts/blog-ledger.json -> ultima entrada de 'publicaciones' (modo manual).

Salida:
  - Imprime cada publicacion por stdout (queda en los logs de Actions).
  - La envia por Telegram si hay TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
    (una publicacion por mensaje, para copiar-pegar comodo). Si faltan, avisa
    y no falla (nunca interrumpe el flujo).

Uso:
  python scripts/gbp_generator.py                 # auto (last-run o ledger)
  python scripts/gbp_generator.py --limit 2       # solo 2 (pruebas)
  python scripts/gbp_generator.py --dry-run       # no envia, solo imprime
  python scripts/gbp_generator.py --source ledger # forzar fuente

Env equivalentes: GBP_LIMIT.
"""

import argparse
import json
import os
import re
import sys

import requests

try:  # asegurar UTF-8 en stdout (consola Windows / logs)
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:  # noqa: BLE001
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LASTRUN_FILE = os.path.join(ROOT, "scripts", "last-run.json")
LEDGER_FILE = os.path.join(ROOT, "scripts", "blog-ledger.json")
TEMAS_FILE = os.path.join(ROOT, "scripts", "blog-temas.json")
BLOG_DIR = os.path.join(ROOT, "blog")

BASE_URL = "https://whitemoon.es"
OG_IMAGE = f"{BASE_URL}/og-image.jpg"
GBP_TITLE_MAX = 58
ZONA = "Majadahonda · Pozuelo · Las Rozas · Boadilla · Madrid noroeste"

# Como se refiere el texto al negocio del lector, por sector.
NEGOCIO = {
    "pymes": "tu negocio",
    "dental": "tu clínica dental",
    "gestorias": "tu gestoría",
    "talleres": "tu taller",
    "estetica": "tu centro de estética",
    "inmobiliaria": "tu inmobiliaria",
    "hosteleria": "tu restaurante",
    "electricistas": "tu negocio de servicios técnicos",
    "fisio": "tu centro de fisioterapia",
    "abogados": "tu despacho",
    "reformas": "tu empresa de reformas",
    "autonomos": "tu actividad como autónomo",
}
NEGOCIO_DEFAULT = "tu negocio"

# Idea concreta de imagen por sector (honesta, sin prometer material que no exista).
IMAGEN_SECTOR = {
    "pymes": "una foto luminosa y real de tu negocio o de alguien atendiendo el móvil con naturalidad",
    "dental": "una recepción de clínica dental ordenada, o un móvil mostrando la confirmación de una cita",
    "gestorias": "un escritorio de gestoría con documentos y un portátil, ambiente profesional y cercano",
    "talleres": "un coche en reparación en el taller, o un móvil con el aviso «tu reparación está lista»",
    "estetica": "una cabina o recepción luminosa, o un móvil con una reserva confirmada",
    "inmobiliaria": "el escaparate de la inmobiliaria o una visita a una vivienda con luz natural",
    "hosteleria": "una mesa preparada del restaurante, o un móvil con una reserva confirmada",
    "electricistas": "un técnico trabajando, o un móvil con un aviso de servicio recibido",
    "fisio": "una camilla de fisioterapia cuidada, o un móvil con una cita agendada",
    "abogados": "un despacho sobrio y ordenado, o un primer plano de una reunión de asesoramiento",
    "reformas": "una reforma en marcha bien iluminada, o un plano sobre la mesa con un presupuesto",
    "autonomos": "un autónomo trabajando con el portátil, ambiente real y cercano",
}
IMAGEN_DEFAULT = "una foto luminosa y real de tu negocio"

# Plantillas de texto (2-3 frases). Se rotan por posición para dar variedad al
# lote semanal. Honestas: sin cifras, sin casos, terminología "Agente IA".
FRAMES = [
    ("Nuevo en el blog: «{titulo}». Te contamos, sin tecnicismos, cómo un Agente IA "
     "puede ayudar en {negocio} a atender consultas y organizar el día a día. Desde "
     "WhiteMoon, tu agencia de IA en Majadahonda y el noroeste de Madrid."),
    ("Esta semana en el blog: «{titulo}». Verás con ejemplos sencillos qué hace un "
     "Agente IA y cómo encaja en {negocio}, sin perder el trato cercano. Somos WhiteMoon, "
     "agencia de IA en el noroeste de Madrid."),
    ("¿Te lo has planteado para {negocio}? En el blog explicamos «{titulo}» paso a paso: "
     "cómo un Agente IA responde, agenda y no deja consultas sin atender. Si tienes un "
     "negocio en Majadahonda o alrededores, escríbenos."),
    ("Lo nuevo del blog: «{titulo}». Un repaso claro y honesto a cómo un Agente IA libera "
     "tiempo en {negocio} ocupándose de lo repetitivo. WhiteMoon · agencia de IA en el "
     "noroeste de Madrid."),
    ("Recién publicado en el blog: «{titulo}». Explicamos de forma sencilla cómo un Agente "
     "IA puede atender a tus clientes también fuera de horario en {negocio}. Desde WhiteMoon, "
     "en Majadahonda y todo Madrid noroeste."),
]


def load_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return default


def temas_por_slug():
    data = load_json(TEMAS_FILE, {}) or {}
    return {t["slug"]: t for t in data.get("temas", [])}


def h1_de_articulo(slug):
    """Devuelve el H1 real (con tildes) del articulo publicado, o None."""
    path = os.path.join(BLOG_DIR, slug, "index.html")
    html = load_text(path)
    if not html:
        return None
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S)
    if not m:
        return None
    txt = re.sub(r"<[^>]+>", "", m.group(1))
    return re.sub(r"\s+", " ", txt).strip() or None


def load_text(path):
    try:
        with open(path, encoding="utf-8") as fh:
            return fh.read()
    except OSError:
        return ""


def titulo_gbp(h1, fallback):
    """Titulo corto para GBP (<= GBP_TITLE_MAX). Prefiere el tramo antes de ':'."""
    base = (h1 or fallback or "").strip()
    base = re.sub(r"\s+", " ", base)
    if len(base) <= GBP_TITLE_MAX:
        return base
    if ":" in base:
        head = base.split(":", 1)[0].strip()
        if 12 <= len(head) <= GBP_TITLE_MAX:
            return head
    out = ""
    for w in base.split():
        if len(out) + len(w) + 1 > GBP_TITLE_MAX:
            break
        out = (out + " " + w).strip()
    return out or base[:GBP_TITLE_MAX].strip()


def recolectar_articulos(source):
    """Lista de dicts {slug, url, fecha} desde last-run.json o el ledger."""
    if source in ("auto", "last-run"):
        lr = load_json(LASTRUN_FILE)
        pub = (lr or {}).get("published") or []
        if pub:
            return [
                {"slug": p["slug"],
                 "url": p.get("url") or f"{BASE_URL}/blog/{p['slug']}/",
                 "fecha": p.get("fecha", "")}
                for p in pub
            ], (lr or {}).get("fecha", "")
        if source == "last-run":
            return [], ""

    # Fallback: ultima publicacion del ledger.
    led = load_json(LEDGER_FILE, {}) or {}
    pubs = led.get("publicaciones") or []
    if not pubs:
        return [], ""
    ultima = pubs[-1]
    return [
        {"slug": s, "url": f"{BASE_URL}/blog/{s}/", "fecha": ultima.get("fecha", "")}
        for s in ultima.get("slugs", [])
    ], ultima.get("fecha", "")


def construir_publicacion(art, tema, idx):
    slug = art["slug"]
    url = art["url"]
    sector = (tema or {}).get("sector", "pymes")
    categoria = (tema or {}).get("categoria", "Agente IA")
    negocio = NEGOCIO.get(sector, NEGOCIO_DEFAULT)

    h1 = h1_de_articulo(slug)
    fallback = (tema or {}).get("titulo", slug.replace("-", " ").capitalize())
    titulo_corto = titulo_gbp(h1, fallback)
    titulo_full = h1 or fallback

    texto = FRAMES[idx % len(FRAMES)].format(titulo=titulo_full, negocio=negocio)

    imagen = IMAGEN_SECTOR.get(sector, IMAGEN_DEFAULT)
    imagen_linea = (
        f"{imagen}. También vale la imagen social del artículo "
        f"(og:image: {OG_IMAGE}). Evita fotos con texto pequeño: GBP recorta a cuadrado."
    )

    return {
        "categoria": categoria,
        "titulo": titulo_corto,
        "texto": texto,
        "url": url,
        "imagen": imagen_linea,
    }


def formatear(pub, i, total):
    return (
        f"PUBLICACIÓN GBP {i}/{total} — {pub['categoria']}\n"
        f"(Google Business Profile · formato «Novedad»)\n\n"
        f"TÍTULO ({len(pub['titulo'])}/{GBP_TITLE_MAX}):\n{pub['titulo']}\n\n"
        f"TEXTO:\n{pub['texto']}\n\n"
        f"CTA / ENLACE (botón «Más información»):\n{pub['url']}\n\n"
        f"IMAGEN:\n{pub['imagen']}\n\n"
        f"ZONA:\n{ZONA}"
    )


def enviar_telegram(mensajes):
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        print("WARN: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID no configurados; se omite el envío.")
        return 0
    enviados = 0
    for text in mensajes:
        try:
            r = requests.post(
                f"https://api.telegram.org/bot{token}/sendMessage",
                json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
                timeout=30,
            )
            print(f"Telegram HTTP {r.status_code}: {r.text[:120]}")
            if r.ok:
                enviados += 1
        except requests.RequestException as exc:  # nunca interrumpe
            print(f"WARN: fallo al enviar Telegram: {exc}")
    return enviados


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=int(os.environ.get("GBP_LIMIT", "0") or 0),
                    help="Máximo de publicaciones a generar (0 = todas).")
    ap.add_argument("--source", choices=["auto", "last-run", "ledger"], default="auto")
    ap.add_argument("--dry-run", action="store_true", help="No envía a Telegram, solo imprime.")
    args = ap.parse_args()

    articulos, fecha = recolectar_articulos(args.source)
    if not articulos:
        print("GBP: no hay artículos recientes (ni last-run.json ni ledger). Nada que generar.")
        return 0

    if args.limit and args.limit > 0:
        articulos = articulos[: args.limit]

    temas = temas_por_slug()
    publicaciones = [
        construir_publicacion(a, temas.get(a["slug"]), i)
        for i, a in enumerate(articulos)
    ]
    total = len(publicaciones)

    bloques = [formatear(p, i + 1, total) for i, p in enumerate(publicaciones)]

    cabecera = (
        f"Publicaciones para Google Business Profile — {fecha or 'último lote'}\n"
        f"{total} lista(s) para copiar y pegar. Una por mensaje 👇"
    )

    # Imprime todo (queda en logs). Separadores claros para lectura humana.
    sep = "\n\n" + ("—" * 24) + "\n\n"
    print(cabecera)
    print(sep + sep.join(bloques))

    if args.dry_run:
        print("\n[dry-run] No se envía a Telegram.")
        return 0

    enviar_telegram([cabecera] + bloques)
    return 0


if __name__ == "__main__":
    sys.exit(main())
