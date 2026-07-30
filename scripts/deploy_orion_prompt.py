#!/usr/bin/env python3
"""Despliega el guion de Orion (voz, Retell) desde `outputs/orion-guion-vNN.txt`.

El prompt del agente en vivo NO vive en este repo: vive en el LLM de Retell
`llm_969b91e48a3e16bdec0676a1b24e`, que alimenta al agente
`agent_4517db737b3b64d809a6a372d3`. Los ficheros de `outputs/` son el snapshot
versionado de lo que hay publicado, y esta utilidad es la que los sube.

Se corrige por API, NO por el dashboard: el dashboard no deja versionar el
cambio y se pierde la trazabilidad de qué versión está publicada.

Flujo (endpoints verificados en docs.retellai.com):
  1. GET  /get-agent-versions/{agent_id}      → localiza la versión publicada
  2. POST /create-agent-version/{agent_id}    → crea un draft desde esa base
  3. PATCH /update-retell-llm/{llm_id}?version=N → escribe `general_prompt`
  4. POST /publish-agent/{agent_id}           → publica el draft
  5. GET  /get-retell-llm/{llm_id}?version=N  → relee y compara

La API key NUNCA va en el repo: se lee de la variable de entorno
RETELL_API_KEY. En Supabase vive como secreto del proyecto y la usa
`supabase/functions/retell-web-call`.

Uso:
    export RETELL_API_KEY=...            # nunca commitear
    python scripts/deploy_orion_prompt.py                      # dry-run
    python scripts/deploy_orion_prompt.py --file outputs/orion-guion-v46.txt --apply
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request

API = "https://api.retellai.com"
AGENT_ID = "agent_4517db737b3b64d809a6a372d3"
LLM_ID = "llm_969b91e48a3e16bdec0676a1b24e"

# Nombres que no pueden reaparecer en el guion publicado.
RETIRADOS = ("Scale", "Elite", "Orion IA Calls", "Gestoría IA", "Orbit", "Scout")


def call(method, path, key, body=None):
    req = urllib.request.Request(
        API + path,
        method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={
            "Authorization": "Bearer " + key,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            raw = r.read().decode()
            return json.loads(raw) if raw.strip() else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()[:500]
        raise SystemExit(f"[retell] {method} {path} → HTTP {exc.code}\n{detail}")


def comprueba_guion(texto):
    """Aborta si el guion trae packs retirados o le falta GestoTrafic."""
    problemas = [n for n in RETIRADOS if n in texto]
    if problemas:
        raise SystemExit("[guion] packs retirados en el texto: " + ", ".join(problemas))
    if "GestoTrafic" not in texto:
        raise SystemExit("[guion] no menciona GestoTrafic")
    # El guion lo lee un TTS, asi que los precios van en letra, no en cifras.
    if "cuatro mil ochocientos noventa y nueve euros" not in texto:
        raise SystemExit("[guion] falta el precio de GestoTrafic en letra")
    if "4.899" in texto:
        raise SystemExit("[guion] precio de GestoTrafic en cifras; debe ir en letra")
    # GestoTrafic NO esta homologado por el Colegio (ICOGAM): no se anuncia la
    # exportacion a OEGAM hasta tenerla. Que Orion no lo diga en una llamada.
    for termino in ("OEGAM", "XML"):
        if termino in texto:
            raise SystemExit(
                f"[guion] menciona {termino}: la exportacion no esta homologada "
                "y no se puede anunciar"
            )
    print(f"[guion] OK · {len(texto)} chars · {len(texto.splitlines())} líneas · 0 packs retirados")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--file", default="outputs/orion-guion-v46.txt")
    ap.add_argument("--apply", action="store_true",
                    help="sin este flag solo lee y compara (dry-run)")
    args = ap.parse_args()

    key = os.environ.get("RETELL_API_KEY")
    if not key:
        raise SystemExit(
            "Falta RETELL_API_KEY en el entorno.\n"
            "Es un secreto del proyecto de Supabase; expórtalo en la shell antes de\n"
            "ejecutar, y no lo dejes en ningún fichero del repo."
        )

    # newline="" + normalizado a LF: en Windows el checkout deja CRLF y, sin
    # esto, se subiria un prompt con \r\n que nunca coincidiria con el
    # publicado y haria fallar la comparacion final en cada despliegue.
    with open(args.file, encoding="utf-8", newline="") as fh:
        nuevo = fh.read().replace("\r\n", "\n").replace("\r", "\n")
    comprueba_guion(nuevo)

    versiones = call("GET", f"/get-agent-versions/{AGENT_ID}", key)
    lista = versiones if isinstance(versiones, list) else versiones.get("versions", [])
    publicadas = [v for v in lista if v.get("is_published")]
    base = max((v["version"] for v in publicadas), default=None)
    if base is None:
        raise SystemExit("[retell] no se encontró ninguna versión publicada del agente")
    print(f"[retell] versión publicada actual: {base}")

    actual = call("GET", f"/get-retell-llm/{LLM_ID}?version={base}", key)
    vigente = actual.get("general_prompt") or ""
    print(f"[retell] prompt publicado: {len(vigente)} chars · "
          f"GestoTrafic {'SÍ' if 'GestoTrafic' in vigente else 'NO'}")

    if vigente.strip() == nuevo.strip():
        print("[retell] el prompt publicado ya es idéntico al fichero. Nada que hacer.")
        return

    if not args.apply:
        print("\n[dry-run] no se ha escrito nada. Repite con --apply para desplegar.")
        print(f"[dry-run] se crearía un draft desde la v{base}, se escribiría el "
              f"general_prompt y se publicaría.")
        return

    draft = call("POST", f"/create-agent-version/{AGENT_ID}", key, {"base_version": base})
    nueva = draft.get("version")
    print(f"[retell] draft creado: v{nueva} (base v{base})")

    call("PATCH", f"/update-retell-llm/{LLM_ID}?version={nueva}", key,
         {"general_prompt": nuevo})
    print(f"[retell] general_prompt escrito en v{nueva}")

    call("POST", f"/publish-agent/{AGENT_ID}", key, {"version": nueva})
    print(f"[retell] v{nueva} publicada")

    releido = call("GET", f"/get-retell-llm/{LLM_ID}?version={nueva}", key)
    ok = (releido.get("general_prompt") or "").strip() == nuevo.strip()
    print(f"[verify] el prompt publicado coincide con el fichero: {'SÍ' if ok else 'NO'}")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
