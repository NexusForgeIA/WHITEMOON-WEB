#!/usr/bin/env python3
"""Notificacion Telegram del generador de blog de WhiteMoon.

Lee scripts/last-run.json y envia un mensaje segun el estado:
  --status success          -> publicados N articulos (con titulos y PR)
  --status guardian-failed  -> el SEO Guardian bloqueo el PR (queda abierto)
  --status error            -> fallo de generacion / sin cambios
  --status nothing          -> no habia temas nuevos

Usa los secrets TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID (los mismos que el SEO Guardian).
Si faltan, hace console.warn y no interrumpe (nunca falla el job por esto).
"""

import argparse
import json
import os

import requests

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LASTRUN_FILE = os.path.join(ROOT, "scripts", "last-run.json")


def load_lastrun():
    try:
        with open(LASTRUN_FILE, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return {"fecha": "?", "published": [], "errors": []}


def build_message(status, pr_url, data):
    fecha = data.get("fecha", "?")
    published = data.get("published", [])
    errors = data.get("errors", [])
    titulos = "\n".join(f"  - {p['titulo']}\n    {p['url']}" for p in published)

    if status == "success":
        msg = f"Blog WhiteMoon — {len(published)} articulos publicados el {fecha}:\n{titulos}"
        if pr_url:
            msg += f"\n\nPR fusionado: {pr_url}"
        if errors:
            msg += f"\n\n(Ademas fallaron {len(errors)} temas, ver logs.)"
        return msg

    if status == "guardian-failed":
        msg = (
            f"Blog WhiteMoon — el SEO Guardian bloqueo la publicacion del {fecha}. "
            f"El PR queda ABIERTO sin fusionar hasta corregir los errores criticos."
        )
        if pr_url:
            msg += f"\nPR: {pr_url}"
        if titulos:
            msg += f"\n\nArticulos pendientes:\n{titulos}"
        return msg

    if status == "nothing":
        return f"Blog WhiteMoon — {fecha}: no habia temas nuevos en el banco. Nada que publicar."

    # error
    detail = ""
    if errors:
        detail = "\n" + "\n".join(f"  - {e.get('slug', '?')}: {e.get('error', '?')}" for e in errors)
    return f"Blog WhiteMoon — fallo en la generacion del {fecha}.{detail}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--status", required=True,
                    choices=["success", "guardian-failed", "error", "nothing"])
    ap.add_argument("--pr", default="")
    args = ap.parse_args()

    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    text = build_message(args.status, args.pr, load_lastrun())
    print(text)

    if not token or not chat_id:
        print("WARN: TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID no configurados; se omite el envio.")
        return

    try:
        r = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": chat_id, "text": text, "disable_web_page_preview": True},
            timeout=30,
        )
        print(f"Telegram HTTP {r.status_code}: {r.text[:200]}")
    except requests.RequestException as exc:  # nunca interrumpe el flujo
        print(f"WARN: fallo al enviar Telegram: {exc}")


if __name__ == "__main__":
    main()
