#!/usr/bin/env python3
"""
rag_ingest_whitemoon.py — indexa whitemoon.es en el RAG del chatbot de texto.

QUÉ HACE
    Recorre las rutas del sitemap y le pide a la Edge Function
    `wm-rag-ingest` que indexe cada una. La función descarga la página
    del sitio EN VIVO ella misma: este script solo dice *qué* indexar,
    nunca *qué contenido* indexar. Por eso no necesita secretos y no
    puede envenenar el RAG.

    Incremental por defecto: la función guarda el hash del texto de
    cada página, así que una pasada completa solo gasta embeddings en
    lo que cambió de verdad. Las demás salen como "sin cambios".

CUÁNDO EJECUTARLO
    Después de cada deploy que cambie contenido visible. Ojo: la
    función lee el sitio publicado, así que hay que esperar a que
    GitHub Pages + Cloudflare hayan servido la versión nueva. Si se
    lanza demasiado pronto se reindexa la versión vieja.

USO
    python scripts/rag_ingest_whitemoon.py                  # sitio entero (incremental)
    python scripts/rag_ingest_whitemoon.py --only /precios/ # una sola página
    python scripts/rag_ingest_whitemoon.py --force          # reindexa aunque no haya cambios
    python scripts/rag_ingest_whitemoon.py --prune          # borra del RAG lo que ya no está en el sitemap
    python scripts/rag_ingest_whitemoon.py --stats          # cuántas páginas y chunks hay indexados

SOBRE LA CLAVE
    Usa la anon key del proyecto, que es pública por diseño (está en
    assets/calc-lead.js y en la migración de cron). No hay ningún
    secreto en este fichero.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

SUPABASE_URL = "https://mlaqtniujnvfxcvcourm.supabase.co"
FUNCION = f"{SUPABASE_URL}/functions/v1/wm-rag-ingest"

# Clave anónima pública del proyecto (misma que assets/calc-lead.js).
ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYXF0bml1am52ZnhjdmNvdXJtIiwicm9sZSI6ImFub24i"
    "LCJpYXQiOjE3Nzc4MzUyMzIsImV4cCI6MjA5MzQxMTIzMn0."
    "Neh7VUS8ADsxf0DPab0JoJyGXOAXnLIaXzXbKzj2BGs"
)

TIMEOUT = 180

# Peticiones por minuto contra la Edge Function. Cada página indexada
# gasta UNA petición a Voyage, así que este número es, en la práctica, el
# límite de Voyage.
#
# La cuenta actual NO tiene método de pago, y Voyage limita esas cuentas
# a 3 RPM / 10K TPM. Por encima de eso devuelve 429 y la ingesta se cae a
# trozos. Con 3 RPM una pasada completa de 290 páginas tarda ~1h40.
#
# Al añadir método de pago en dashboard.voyageai.com (los 200M tokens
# gratis se mantienen) el límite sube y esto se puede poner en 60 o más:
#   python scripts/rag_ingest_whitemoon.py --rpm 60
RPM_DEFECTO = 3


class Regulador:
    """Mantiene el ritmo de las páginas que SÍ gastan embeddings.

    La espera va DESPUÉS de indexar, no antes de cada petición: una
    página sin cambios no llega a tocar Voyage, así que no debe pagar el
    peaje. Gracias a eso una re-ingesta en la que no cambió casi nada
    tarda minutos en vez de la hora y pico que costaría espaciarlo todo.
    """

    def __init__(self, rpm: int):
        self.intervalo = 60.0 / rpm if rpm > 0 else 0.0
        self._ultima = 0.0

    def consumir(self) -> None:
        if not self.intervalo:
            return
        resto = self.intervalo - (time.monotonic() - self._ultima)
        if resto > 0:
            time.sleep(resto)
        self._ultima = time.monotonic()


REGULADOR = Regulador(RPM_DEFECTO)


def llamar(payload: dict) -> dict:
    req = urllib.request.Request(
        FUNCION,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {ANON_KEY}",
            "apikey": ANON_KEY,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode("utf-8"))
        except Exception:
            return {"error": f"HTTP {e.code}"}
    except Exception as e:  # timeout, red caída...
        return {"error": str(e)}


def indexar(url: str, force: bool) -> tuple[str, dict]:
    payload = {"url": url}
    if force:
        payload["force"] = True
    res = llamar(payload)
    # Solo consume ritmo lo que ha llegado a embeber.
    if not res.get("sin_cambios"):
        REGULADOR.consumir()
    return url, res


def main() -> int:
    ap = argparse.ArgumentParser(description="Indexa whitemoon.es en el RAG del chatbot de texto.")
    ap.add_argument("--only", help="Indexa solo esta ruta (p. ej. /precios/)")
    ap.add_argument("--force", action="store_true", help="Reindexa aunque el contenido no haya cambiado")
    ap.add_argument("--prune", action="store_true", help="Borra del RAG las páginas que ya no están en el sitemap")
    ap.add_argument("--stats", action="store_true", help="Muestra el estado del índice y sale")
    ap.add_argument(
        "--rpm", type=int, default=RPM_DEFECTO,
        help=f"Páginas por minuto (límite de Voyage). Por defecto {RPM_DEFECTO}, "
             "que es el techo de una cuenta sin método de pago.",
    )
    args = ap.parse_args()

    global REGULADOR
    REGULADOR = Regulador(args.rpm)

    if args.stats:
        print(json.dumps(llamar({"op": "stats"}), ensure_ascii=False, indent=2))
        return 0

    if args.prune:
        r = llamar({"op": "prune"})
        eliminadas = r.get("eliminadas", [])
        print(f"prune: {len(eliminadas)} páginas eliminadas del índice")
        for u in eliminadas:
            print(f"  - {u}")
        return 0 if r.get("ok") else 1

    if args.only:
        rutas = [args.only]
    else:
        r = llamar({"op": "sitemap"})
        rutas = r.get("rutas") or []
        if not rutas:
            print(f"No se pudo leer el sitemap: {r.get('error')}", file=sys.stderr)
            return 1

    eta = len(rutas) / args.rpm if args.rpm else 0
    print(
        f"Indexando {len(rutas)} rutas (force={args.force}, {args.rpm} rpm). "
        f"Si cambiaran todas: ~{eta:.0f} min; las que no cambien no gastan ritmo.\n"
    )

    nuevas = iguales = fallos = chunks = 0
    errores: list[tuple[str, str]] = []

    # Secuencial a propósito: con un límite de 3 RPM, lanzar peticiones en
    # paralelo solo produce 429 en cadena. El cuello de botella es Voyage,
    # no la red.
    for i, url in enumerate(rutas, 1):
        _, res = indexar(url, args.force)
        if res.get("error"):
            fallos += 1
            errores.append((url, str(res["error"])))
            estado = f"ERROR  {str(res['error'])[:60]}"
        elif res.get("sin_cambios"):
            iguales += 1
            estado = "sin cambios"
        else:
            nuevas += 1
            chunks += res.get("chunks", 0)
            estado = f"indexada ({res.get('chunks')} chunks)"
        print(f"[{i:3}/{len(rutas)}] {url:<52} {estado}", flush=True)

    print(
        f"\nResumen: {nuevas} indexadas ({chunks} chunks nuevos) · "
        f"{iguales} sin cambios · {fallos} con error"
    )
    if errores:
        print("\nFallos:")
        for u, e in errores:
            print(f"  {u}: {e}")

    total = llamar({"op": "stats"})
    print(f"\nÍndice: {total.get('paginas')} páginas · {total.get('chunks')} chunks")
    return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main())
