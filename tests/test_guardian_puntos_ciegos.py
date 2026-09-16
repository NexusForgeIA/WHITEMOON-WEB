#!/usr/bin/env python3
"""Fixtures de los checks 17-19 del SEO Guardian.

Fijan la frontera que costo varios PRs encontrar: que cuenta como tarifa
NUESTRA (salta) y que es coste de mercado (no salta). El caso 2 es el que
importa de verdad — es la frase que hay hoy en /calculadora-escalabilidad-ia/
y que debe poder escribirse sin que el Guardian la marque.

    python tests/test_guardian_puntos_ciegos.py
    pytest tests/test_guardian_puntos_ciegos.py
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from seo_guardian import (  # noqa: E402
    js_constante_precio,
    meta_tarifa_retirada,
    tarifa_propia,
)


# ── 1 · tarifa nuestra en forma setup + cuota → SALTA (check 17) ───────────
def test_tarifa_setup_mas_cuota_salta():
    js = "const PACKS={advance:{title:'Spark',price:'499€ + 199€/mes'}};"
    hallazgos = tarifa_propia("assets/home.js", js)
    assert hallazgos, "la forma setup+cuota tiene que saltar"
    assert any("setup+cuota" in h for h in hallazgos)


def test_tarifa_sin_simbolo_de_pack_tambien_salta_por_la_forma():
    # La señal A no necesita nombre de pack: ningun sueldo se escribe asi.
    assert tarifa_propia("x.js", "Desde 899€ + 99€/mes sin permanencia")


# ── 2 · coste laboral de mercado → NO SALTA ───────────────────────────────
def test_coste_laboral_de_escalabilidad_no_salta():
    # Frase real y vigente de /calculadora-escalabilidad-ia/. Es argumento de
    # venta (lo que cuesta contratar a una persona), no tarifa nuestra.
    faq = ("Total empresa 1.800-2.500€/mes (bruto 1.350-1.850 + SS 32% + "
           "indirectos). Seleccion 800-1.500€. Formacion 1.500-3.000€.")
    assert tarifa_propia("calculadora-escalabilidad-ia/index.html", faq) == []


def test_recepcionista_no_salta():
    texto = "Un recepcionista a jornada completa supone entre 1.500€ y 2.200€ al mes."
    assert tarifa_propia("atencion-cliente-ia/index.html", texto) == []


def test_salario_con_nombre_de_pack_cerca_sigue_sin_saltar():
    # El veto laboral gana aunque "Spark" aparezca al lado: la cifra describe
    # a la persona, no al pack.
    texto = "Frente a Spark, un empleado en nomina cuesta 1.800€ de salario bruto."
    assert tarifa_propia("x/index.html", texto) == []


# ── 3 · constante de precio cableada en JS, sin € → SALTA (check 19) ───────
def test_wm_base_sintetico_salta():
    js = "var COST_H = 18;\nvar WM_BASE = 199 + 499/12; // cuota amortizada\n"
    hallazgos = js_constante_precio(js)
    valores = {v for v, _ in hallazgos}
    assert 499 in valores, f"WM_BASE deberia saltar, salio {hallazgos}"


def test_numero_suelto_sin_identificador_no_salta():
    # 1800 como delay de animacion, 499 como z-index: no son precios.
    assert js_constante_precio("{type:'user', delay:1800}") == []
    assert js_constante_precio("el.style.zIndex = 499;") == []


# ── 4 · meta de stub con tarifa retirada → SALTA (check 18) ────────────────
def test_meta_de_stub_con_899_salta():
    # /auditoria-ia/ antes del PR #766. Es un stub de IGNORED_DIRS: ningun
    # check lo miraba, pero Google si servia esta meta en el snippet.
    html = ('<meta name="description" content="Auditoria GEO IA de WhiteMoon: '
            'aparece tu negocio en ChatGPT, Grok y Perplexity? Informe PDF '
            'completo en 24h. 899€ pago unico.">')
    hallazgos = meta_tarifa_retirada(html)
    assert [v for v, _ in hallazgos] == [899]


def test_meta_con_coste_laboral_no_salta():
    html = ('<meta name="description" content="Calcula el coste de un empleado: '
            'salario bruto de 1.800€ mas cotizaciones.">')
    assert meta_tarifa_retirada(html) == []


if __name__ == "__main__":
    fallos = 0
    for nombre, fn in sorted(globals().items()):
        if not nombre.startswith("test_"):
            continue
        try:
            fn()
            print(f"  PASS  {nombre}")
        except AssertionError as exc:
            fallos += 1
            print(f"  FAIL  {nombre}: {exc}")
    print(f"\n{'TODO OK' if not fallos else str(fallos) + ' FALLOS'}")
    sys.exit(1 if fallos else 0)
