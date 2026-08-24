#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Inserta el bloque CTA `.calc-cta` (calculadora -> embudo /demos/) en las
páginas de calculadoras.

Idempotente: si la página ya tiene el bloque, la salta. Los estilos viven en
`assets/site.css` y `assets/landing-generic.css`; las dos calculadoras con CSS
propio (`calculadora-itp`, `calculadora-nomina`) los llevan en su <style> inline.

El botón es SECUNDARIO a propósito (fondo transparente, borde `--p`, texto
`--p2`): en estas páginas la acción primaria es la captura de teléfono
("Quiero que me llamen"), y la demo no debe competir con ella. Una calculadora
nueva hereda ese estilo con solo emitir la clase `.calc-cta-btn`; si nace con
CSS propio, hay que copiarle también el bloque `.calc-cta*` inline.

Colocación — siempre POR DEBAJO de la herramienta y del formulario de lead:
  · 62 páginas: justo tras el </section> que cierra el bloque de captura
    (`form.calc-lead-form`).
  · 2 páginas sin ese formulario: justo antes de la sección de FAQ.

Uso:  python scripts/add_calc_cta.py [--dry-run]
"""

import glob
import io
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ── Mensaje por categoría de calculadora ───────────────────────────────────
MENSAJES = {
    "fiscal": (
        "¿Gestoría o asesoría?",
        "Un agente de IA atiende las consultas de tus clientes y capta leads "
        "24/7. Míralo funcionando en la demo guiada.",
    ),
    "vehiculos": (
        "¿Compraventa, taller o autoescuela?",
        "Automatiza las consultas que te entran cada día y capta clientes "
        "con un agente de IA 24/7.",
    ),
    "legal": (
        "¿Despacho o abogado?",
        "Atiende consultas y capta casos con un agente de IA 24/7, también "
        "cuando el despacho está cerrado.",
    ),
    "generico": (
        "¿Tienes un negocio?",
        "Un agente de IA atiende, agenda y capta clientes por ti 24/7.",
    ),
}

VEHICULOS = {
    "cambio-titularidad-vehiculo", "depreciacion-vehiculo",
    "gastos-compra-coche-segunda-mano", "impuesto-matriculacion",
    "itp",  # ITP de vehículos: coche, moto, quad, autocaravana, embarcación.
    "seguro-coche-estimado", "transferencia-vehiculo",
}
LEGAL = {
    "indemnizacion-accidente-trafico", "indemnizacion-despido",
    "tasas-judiciales",
}
FISCAL = {
    "beneficio-neto-autonomo", "cuota-autonomos", "donaciones", "finiquito",
    "gastos-compra-vivienda", "gastos-deducibles-autonomos",
    "herencia-impuesto-sucesiones", "horas-extra", "ingresos-reales-autonomo",
    "irpf-autonomos", "itp-vivienda", "iva-autonomos", "nomina",
    "plusvalia-municipal", "prestacion-paro", "retencion-irpf",
    "sanciones-fiscales", "subida-salarial", "sueldo-neto",
    "vacaciones-pendientes",
}


def categoria(slug):
    """slug = nombre de carpeta sin el prefijo 'calculadora-'."""
    if slug in VEHICULOS:
        return "vehiculos"
    if slug in LEGAL:
        return "legal"
    if slug in FISCAL:
        return "fiscal"
    return "generico"


def bloque(slug):
    titulo, texto = MENSAJES[categoria(slug)]
    return (
        '\n  <section class="calc-cta">\n'
        '    <div class="calc-cta-card">\n'
        '      <div class="calc-cta-txt">\n'
        '        <h2 class="calc-cta-h">%s</h2>\n'
        '        <p class="calc-cta-p">%s</p>\n'
        '      </div>\n'
        '      <a class="calc-cta-btn" href="/demos/" '
        'onclick="wmTrack(\'click_calc_to_demo\',{from:\'calc-%s\'})">'
        'Probar la demo guiada <span aria-hidden="true">→</span></a>\n'
        '    </div>\n'
        '  </section>\n' % (titulo, texto, slug)
    )


def punto_insercion(html, relpath):
    """Devuelve el offset donde insertar el bloque, o None si no se localiza."""
    form = re.search(r'<form[^>]*class="calc-lead-form"', html)
    if form:
        cierre = html.find("</section>", form.end())
        siguiente = html.find("<section", form.end())
        if cierre != -1 and (siguiente == -1 or cierre < siguiente):
            return cierre + len("</section>")
        print("  !! %s: el form no cierra en un <section> limpio" % relpath)
        return None

    # Sin formulario de lead: justo antes de la sección que abre la FAQ.
    faq = re.search(r'<h2[^>]*>\s*(?:FAQ|Preguntas frecuentes)', html, re.I)
    if not faq:
        print("  !! %s: sin form de lead y sin FAQ localizable" % relpath)
        return None
    sec = html.rfind("<section", 0, faq.start())
    if sec == -1:
        print("  !! %s: no se localiza el <section> de la FAQ" % relpath)
        return None
    return sec


def main():
    dry = "--dry-run" in sys.argv
    hechos = saltados = fallos = 0
    for d in sorted(glob.glob(os.path.join(ROOT, "calculadora-*"))):
        slug = os.path.basename(d)[len("calculadora-"):]
        path = os.path.join(d, "index.html")
        if not os.path.exists(path):
            continue
        html = io.open(path, encoding="utf-8").read()
        if 'class="calc-cta"' in html:
            saltados += 1
            continue
        pos = punto_insercion(html, os.path.basename(d))
        if pos is None:
            fallos += 1
            continue
        nuevo = html[:pos] + bloque(slug) + html[pos:]
        if not dry:
            io.open(path, "w", encoding="utf-8", newline="").write(nuevo)
        hechos += 1
        print("  ok %-46s %s" % (slug, categoria(slug)))
    print("\ninsertados: %d · ya tenían: %d · sin anclaje: %d"
          % (hechos, saltados, fallos))
    return 1 if fallos else 0


if __name__ == "__main__":
    sys.exit(main())
