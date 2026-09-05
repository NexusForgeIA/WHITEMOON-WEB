#!/usr/bin/env python3
"""Aviso de caducidad del banco de pruebas GEO.

Lo que responde un LLM no se puede verificar automaticamente: las respuestas
cambian por usuario, fecha, version y ubicacion. Asi que esto NO comprueba
nada — solo mira cuanto hace que se recapturo a mano y avisa por Telegram
cuando toca repetirlo.

Vive fuera de seo_guardian.py A PROPOSITO: ese script lo comparten el run
semanal y el gate de PRs (seo-guardian-pr.yml), y este aviso no debe bloquear
ni ensuciar ningun merge. Solo lo invoca el workflow semanal.

Uso:
    python scripts/geo_freshness.py            # avisa por Telegram si toca
    python scripts/geo_freshness.py --dry-run  # imprime, no envia
"""
from __future__ import annotations

import argparse
import os
import re
import sys
from datetime import date, datetime

PAGINA = "metodologia-visibilidad-ia/index.html"
URL = "https://whitemoon.es/metodologia-visibilidad-ia/#banco-pruebas"
MARCADOR = "geo-pruebas-verificado"
DIAS_LIMITE = 35

# La consulta que hay que relanzar en cada motor al recapturar.
CONSULTA = "mejor agencia de IA en Majadahonda"

RX = re.compile(
    r'<meta\s+name=["\']%s["\']\s+content=["\'](\d{4}-\d{2}-\d{2})["\']' % MARCADOR,
    re.I,
)


def leer_fecha(ruta: str):
    """Devuelve (fecha, None) o (None, motivo) si no se puede leer."""
    if not os.path.exists(ruta):
        return None, "no existe %s" % ruta
    texto = open(ruta, encoding="utf-8").read()
    m = RX.search(texto)
    if not m:
        return None, 'falta el <meta name="%s"> en %s' % (MARCADOR, ruta)
    try:
        return datetime.strptime(m.group(1), "%Y-%m-%d").date(), None
    except ValueError:
        return None, "fecha ilegible en el marcador: %r" % m.group(1)


def mensaje(fecha, motivo, dias):
    if motivo:
        return (
            "⚠️ SEO Guardian · marcador de frescura GEO ausente.\n"
            "%s\n"
            "Sin el marcador no se puede saber cuando se recapturo el banco de "
            "pruebas. Anade <meta name=\"%s\" content=\"AAAA-MM-DD\"> con la fecha "
            "de la ultima comprobacion real.\n%s" % (motivo, MARCADOR, URL)
        )
    return (
        "⚠️ Banco de pruebas GEO verificado hace %d días (última: %s).\n"
        "Re-capturar ChatGPT/Grok/Perplexity para «%s» y actualizar capturas + fecha.\n"
        "%s" % (dias, fecha.isoformat(), CONSULTA, URL)
    )


def enviar_telegram(texto: str) -> bool:
    """Mismo bot y mismo chat que usa el SEO Guardian. El token sale de los
    Secrets: nunca se escribe en el repo."""
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        print("TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID no configurados; no se envia.")
        return False
    try:
        import requests
        resp = requests.post(
            "https://api.telegram.org/bot%s/sendMessage" % token,
            json={"chat_id": chat_id, "text": texto, "disable_web_page_preview": True},
            timeout=30,
        )
        print("Telegram HTTP %s: %s" % (resp.status_code, resp.text[:300]))
        return resp.ok
    except Exception as exc:  # noqa: BLE001 — un aviso no debe tumbar el job
        print("Error al enviar la notificacion Telegram: %s" % exc)
        return False


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="imprime, no envia")
    ap.add_argument("--limite", type=int, default=DIAS_LIMITE)
    ap.add_argument("--hoy", help="AAAA-MM-DD, para probar el umbral")
    args = ap.parse_args()

    hoy = datetime.strptime(args.hoy, "%Y-%m-%d").date() if args.hoy else date.today()
    fecha, motivo = leer_fecha(PAGINA)
    dias = (hoy - fecha).days if fecha else None

    if fecha:
        print("Ultima verificacion: %s · hace %d dias · limite %d"
              % (fecha.isoformat(), dias, args.limite))
    else:
        print("Marcador no legible: %s" % motivo)

    # Fecha en el futuro: no es motivo de aviso, pero se deja constancia.
    if dias is not None and dias < 0:
        print("La fecha del marcador esta en el futuro; no se avisa.")
        return 0

    if not motivo and dias is not None and dias <= args.limite:
        print("Dentro de plazo: no se envia aviso.")
        return 0

    texto = mensaje(fecha, motivo, dias)
    print("--- aviso ---\n%s\n-------------" % texto)
    if args.dry_run:
        print("(--dry-run: no se ha enviado)")
        return 0
    enviar_telegram(texto)
    # Siempre 0: esto es un aviso, no un fallo de calidad.
    return 0


if __name__ == "__main__":
    sys.exit(main())
