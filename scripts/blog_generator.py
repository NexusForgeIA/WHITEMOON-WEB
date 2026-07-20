#!/usr/bin/env python3
"""Generador automatico de blog SEO para whitemoon.es.

Flujo:
1. Carga el banco de temas (blog-temas.json) y el ledger (blog-ledger.json).
2. Coge los N primeros temas no usados (N = env BLOG_COUNT, por defecto 5).
3. Para cada tema pide a la Claude API el CONTENIDO del articulo (JSON estructurado)
   siguiendo las reglas SEO/GEO/AEO de WhiteMoon.
4. Renderiza el HTML deterministicamente replicando el articulo de referencia
   (blog/agentes-ia-pymes-2026/index.html) + un bloque FAQ (DOM) sincronizado con
   el schema FAQPage.
5. Escribe blog/<slug>/index.html, actualiza sitemap.xml y blog/index.html
   (schema Blog + tarjeta visible), y marca los temas como usados en el ledger.
6. Escribe scripts/last-run.json con el resumen (lo usa el workflow para el PR
   y la notificacion de Telegram).

El renderizado esta pensado para pasar EN VERDE el SEO Guardian (seo_guardian.py):
- title <= 65 (con " · WhiteMoon"), meta description <= 160  -> se truncan si hace falta.
- og:image en JPG (/og-image.jpg), nunca SVG.
- 1 solo <h1>. Ninguna <img> en el cuerpo (la unica img, el logo, lleva width/height/alt).
- JSON-LD valido (BlogPosting + FAQPage), con headline = title exacto y description = meta exacto.
- FAQPage con las mismas preguntas que el DOM (acordeon <details>).

Modo prueba sin API:  python scripts/blog_generator.py --selftest [N]
  Usa contenido de ejemplo (honesto, sin cifras inventadas) en vez de llamar a Claude.
  Sirve para verificar render + guardian localmente sin ANTHROPIC_API_KEY.

Dependencias: anthropic (solo en modo real).
"""

import html
import json
import os
import re
import sys
from datetime import datetime, timezone

# ── Rutas y constantes ──────────────────────────────────────────────────────
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMAS_FILE = os.path.join(ROOT, "scripts", "blog-temas.json")
LEDGER_FILE = os.path.join(ROOT, "scripts", "blog-ledger.json")
LASTRUN_FILE = os.path.join(ROOT, "scripts", "last-run.json")
SITEMAP_FILE = os.path.join(ROOT, "sitemap.xml")
BLOG_INDEX_FILE = os.path.join(ROOT, "blog", "index.html")
BLOG_DIR = os.path.join(ROOT, "blog")

BASE_URL = "https://whitemoon.es"
OG_IMAGE = f"{BASE_URL}/og-image.jpg"  # JPG por defecto del sitio (nunca SVG, sin hotlink)
DEFAULT_MODEL = "claude-opus-4-8"
STRIPE_COLORS = ["purple", "cyan", "green"]

# Pool de articulos existentes para "articulos relacionados" (URLs verificadas en el repo).
# Deterministico -> nunca genera enlaces internos rotos.
RELATED_POOL = [
    ("Agente IA", "Agentes IA en 2026: que son y para que sirven", "/blog/agentes-ia-pymes-2026/"),
    ("Agente IA", "Que es un Agente IA: guia completa para empresas", "/blog/que-es-un-agente-ia/"),
    ("Comparativa", "Agente IA vs Chatbot: 6 diferencias reales", "/blog/agente-ia-vs-chatbot-diferencias/"),
    ("Agente de voz", "Que es un agente de voz IA y por que lo necesitas", "/blog/que-es-agente-voz-ia-2026/"),
    ("Agente de voz", "Orion IA: el agente de voz que atiende 24/7", "/blog/orion-ia-agente-voz-24-7/"),
    ("SEO y GEO", "GEO/AEO: posicionamiento IA para pymes", "/blog/geo-aeo-posicionamiento-ia-pymes/"),
    ("Precios", "Cuanto cuesta implementar IA en tu negocio", "/blog/cuanto-cuesta-ia-negocio/"),
    ("Estrategia", "Automatizacion de procesos con IA para pymes", "/blog/automatizacion-procesos-ia-pymes/"),
    ("Datos", "5 datos que demuestran el ROI de un Agente IA", "/blog/roi-agente-ia-pymes-datos/"),
    ("Atencion", "IA en atencion al cliente para pymes en Espana", "/blog/ia-atencion-cliente-pymes-espana/"),
]

# ── Reglas de contenido para Claude (skill SEO/GEO/AEO WhiteMoon) ────────────
SYSTEM_PROMPT = """Eres el redactor SEO de WhiteMoon, una agencia de inteligencia artificial de Majadahonda (Madrid noroeste) que implementa Agentes IA para pymes y autonomos.

Escribes articulos de blog en ESPANOL DE ESPANA, tono profesional cercano, claro y directo. Nada de relleno.

REGLAS ABSOLUTAS (el incumplimiento invalida el articulo):
- PROHIBIDO inventar testimonios, casos de exito con nombre, cifras, porcentajes, estadisticas o resultados concretos. No escribas "un 28% mas" ni "reduccion del 35%" ni datos que no puedas verificar. Habla en terminos cualitativos y honestos ("suele reducir las llamadas perdidas", "muchos negocios recuperan horas"). Si mencionas un rango, deja claro que es orientativo.
- Usa SIEMPRE el termino "Agente IA" (o "agente de voz IA" / "agente de texto"). NUNCA escribas "Chatbot IA" como producto; puedes mencionar la palabra "chatbot" solo para explicar la diferencia con un Agente IA.
- Sin emojis en el texto.
- No menciones packs retirados (Scale, Elite, Orion IA Calls). Packs vigentes: Spark, Orion IA Agent, Core Spark Web, Core Orion, Core RAG. Ningun pack tiene permanencia.
- No prometas integraciones que no sabes que existen. No menciones "WhatsApp Business API" como algo implementado salvo que el tema lo pida de forma generica.
- Enlaza como maximo de forma natural; no inventes URLs (los enlaces los pone la plantilla).

DEVUELVES SOLO el contenido en el formato JSON pedido. No escribas HTML: solo texto plano en cada campo (la plantilla lo maqueta).
- titulo_seo: titular del articulo, atractivo y con la keyword, MAXIMO 50 caracteres (se le anade " · WhiteMoon" despues).
- h1: titular H1 visible, puede ser algo mas descriptivo que titulo_seo, sin " · WhiteMoon".
- intro: 1 parrafo introductorio potente (2-4 frases) que enganche y contextualice.
- secciones: 5 a 7 secciones, cada una con h2 (titulo de seccion) y parrafos (lista de 1-3 parrafos de texto plano). Cubre que es, como funciona, casos por sector, como se integra con las herramientas actuales, cuando SI y cuando NO conviene, y como empezar con WhiteMoon.
- faqs: 3 a 5 preguntas frecuentes reales que se haria el lector, con respuesta clara (2-4 frases) y honesta.
- excerpt: resumen de 1 frase para la tarjeta del blog, MAXIMO 155 caracteres, sin comillas.
- cta_texto: 1 frase para el CTA intermedio invitando a aplicar la idea al negocio del lector.
"""

OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "titulo_seo": {"type": "string"},
        "h1": {"type": "string"},
        "intro": {"type": "string"},
        "secciones": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "h2": {"type": "string"},
                    "parrafos": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["h2", "parrafos"],
                "additionalProperties": False,
            },
        },
        "faqs": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "pregunta": {"type": "string"},
                    "respuesta": {"type": "string"},
                },
                "required": ["pregunta", "respuesta"],
                "additionalProperties": False,
            },
        },
        "excerpt": {"type": "string"},
        "cta_texto": {"type": "string"},
    },
    "required": ["titulo_seo", "h1", "intro", "secciones", "faqs", "excerpt", "cta_texto"],
    "additionalProperties": False,
}


# ── Utilidades ──────────────────────────────────────────────────────────────
def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def save_json(path, data):
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")


def now_madrid():
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("Europe/Madrid"))
    except Exception:  # noqa: BLE001
        return datetime.now(timezone.utc)


def esc(text):
    """Escapa texto para HTML visible."""
    return html.escape(str(text).strip())


def esc_attr(text):
    """Escapa texto para un atributo HTML."""
    return html.escape(str(text).strip(), quote=True)


def clamp(text, limit):
    """Trunca 'text' a <= limit caracteres cortando por palabra cuando es posible."""
    text = " ".join(str(text).split())
    if len(text) <= limit:
        return text
    cut = text[: limit - 1].rstrip()  # deja 1 hueco para el caracter de puntos suspensivos
    if " " in cut:
        cut = cut[: cut.rfind(" ")].rstrip()
    return cut + "…"


def word_count(data):
    parts = [data["intro"]]
    for s in data["secciones"]:
        parts.append(s["h2"])
        parts.extend(s["parrafos"])
    for f in data["faqs"]:
        parts.append(f["pregunta"])
        parts.append(f["respuesta"])
    return len(" ".join(parts).split())


# ── Llamada a Claude API ────────────────────────────────────────────────────
def generate_content(tema, model):
    """Pide a la Claude API el contenido del articulo. Devuelve dict validado por schema."""
    import anthropic

    client = anthropic.Anthropic()  # lee ANTHROPIC_API_KEY del entorno
    user_msg = (
        f"Escribe el articulo de blog para WhiteMoon.\n"
        f"Tema: {tema['titulo']}\n"
        f"Keyword objetivo: {tema['keyword']}\n"
        f"Sector: {tema['sector']}\n"
        f"Categoria: {tema['categoria']}\n\n"
        f"Recuerda: nada de cifras o casos inventados, espanol de Espana, sin emojis, "
        f"termino 'Agente IA' (no 'Chatbot IA'). Devuelve solo el JSON del contenido."
    )
    resp = client.messages.create(
        model=model,
        max_tokens=16000,
        system=[{"type": "text", "text": SYSTEM_PROMPT, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user_msg}],
        output_config={"format": {"type": "json_schema", "schema": OUTPUT_SCHEMA}},
    )
    text = next((b.text for b in resp.content if b.type == "text"), None)
    if not text:
        raise RuntimeError("La API no devolvio texto JSON.")
    return json.loads(text)


def canned_content(tema):
    """Contenido de ejemplo honesto para --selftest (sin llamar a la API)."""
    titulo = tema["titulo"]
    sector = tema["sector"]
    return {
        "titulo_seo": clamp(titulo, 50),
        "h1": titulo,
        "intro": (
            f"Cada llamada sin responder o cada mensaje que se queda sin contestar es una "
            f"oportunidad que se enfria. En este articulo vemos, sin humo, como un Agente IA "
            f"ayuda a un negocio del sector {sector} a estar disponible siempre y no perder clientes."
        ),
        "secciones": [
            {"h2": "Que es un Agente IA (y que no)", "parrafos": [
                "Un Agente IA no es un simple menu de respuestas automaticas. Recibe un objetivo, "
                "entiende lo que necesita la persona que escribe o llama, y actua: responde dudas, "
                "cualifica al cliente y agenda o deriva cuando hace falta.",
                "La diferencia con un chatbot tradicional es que el Agente IA mantiene una "
                "conversacion natural y realiza tareas, no solo suelta textos predefinidos.",
            ]},
            {"h2": "Como funciona en el dia a dia", "parrafos": [
                "El Agente IA atiende por texto en la web o por voz al telefono, las 24 horas. "
                "Cuando alguien pregunta por precios, disponibilidad o servicios, responde con la "
                "informacion de tu negocio y recoge los datos de contacto.",
                "Todo queda registrado, asi que puedes revisar cada conversacion y mejorar lo que "
                "el Agente IA responde con el tiempo.",
            ]},
            {"h2": f"Casos utiles en el sector {sector}", "parrafos": [
                "Los usos mas habituales son atender fuera de horario, resolver las preguntas "
                "repetidas y no dejar ningun contacto sin seguimiento. Son tareas que se repiten "
                "cada semana y que hoy consumen tiempo del equipo.",
            ]},
            {"h2": "Como se integra con tus herramientas", "parrafos": [
                "No hace falta cambiarlo todo. El Agente IA se coloca sobre tu web actual o tu "
                "telefono y puede conectarse con las herramientas que ya usas para agenda y contacto. "
                "Se empieza poco a poco y se amplia cuando ves el valor.",
            ]},
            {"h2": "Cuando conviene y cuando no", "parrafos": [
                "Si recibes consultas repetidas, llamadas fuera de horario o pierdes contactos por "
                "no poder atender a todos, un Agente IA encaja. Si tu volumen es muy bajo o cada caso "
                "es totalmente distinto, quiza sea pronto: primero conviene ordenar el proceso.",
            ]},
            {"h2": "Como empezar con WhiteMoon", "parrafos": [
                "En WhiteMoon empezamos por una conversacion corta para entender tu negocio antes de "
                "proponer nada. Si vemos que tiene sentido, te ensenamos como quedaria y te pasamos "
                "un presupuesto sin compromiso. Sin permanencia.",
            ]},
        ],
        "faqs": [
            {"pregunta": "Necesito cambiar mi web o mi telefono actual?",
             "respuesta": "No. El Agente IA se integra sobre lo que ya tienes, tanto en la web como en la atencion telefonica."},
            {"pregunta": "El Agente IA suena natural?",
             "respuesta": "El agente de voz habla en espanol natural. La idea es que el cliente tenga una conversacion fluida, no un menu de opciones."},
            {"pregunta": "Tiene permanencia?",
             "respuesta": "Ninguno de los packs de WhiteMoon tiene permanencia. Puedes cancelar avisando con 30 dias."},
            {"pregunta": "En cuanto tiempo esta operativo?",
             "respuesta": "Los packs habituales se ponen en marcha en 5-7 dias laborables una vez tenemos la informacion de tu negocio."},
        ],
        "excerpt": clamp(f"Como un Agente IA ayuda a un negocio del sector {sector} a atender siempre y no perder clientes.", 155),
        "cta_texto": "Quieres aplicar esto a tu negocio? Te contamos como quedaria, sin compromiso.",
    }


# ── Renderizado HTML ────────────────────────────────────────────────────────
STYLE_BLOCK = """<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--p:#7c4dff;--p2:#9d70ff;--g:#00d4aa;--bg:#08080d;--bg2:#0e0e16;--bg3:#13131e;--text:#f0f0f5;--muted:#8888a0;--border:rgba(124,77,255,.15);--r:14px;}
body{font-family:'Sora',sans-serif;background:var(--bg);color:var(--text);line-height:1.6;}
a{color:var(--p2);text-decoration:none;}
.wrap{max-width:760px;margin:0 auto;padding:0 24px;}
nav{background:rgba(8,8,13,.95);border-bottom:1px solid var(--border);padding:14px 0;position:sticky;top:0;z-index:100;}
.nav-in{display:flex;align-items:center;justify-content:space-between;max-width:960px;margin:0 auto;padding:0 24px;}
.nav-logo{height:34px;}
.nav-cta{background:var(--p);color:#fff;padding:8px 16px;border-radius:8px;font-size:.8rem;font-weight:600;}
.breadcrumb{font-size:.75rem;color:var(--muted);padding:14px 0;}
.breadcrumb a{color:var(--p2);}
.breadcrumb span{margin:0 6px;}
.post-hero{padding:48px 0 20px;}
.post-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(124,77,255,.1);border:1px solid rgba(124,77,255,.2);padding:4px 12px;border-radius:50px;font-size:.68rem;font-weight:600;color:var(--p2);letter-spacing:.06em;text-transform:uppercase;margin-bottom:18px;}
.post-hero h1{font-size:clamp(1.5rem,3.5vw,2.2rem);font-weight:800;letter-spacing:-.02em;line-height:1.2;margin-bottom:16px;}
.post-meta{font-size:.78rem;color:var(--muted);display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.post-meta-dot{width:3px;height:3px;border-radius:50%;background:var(--muted);display:inline-block;}
.art-intro{font-size:1rem;color:#b0b0c0;line-height:1.8;background:rgba(124,77,255,.05);border-left:3px solid var(--p);padding:16px 20px;border-radius:0 8px 8px 0;margin:28px 0;}
.art-body{padding-bottom:40px;}
.art-body h2{font-size:1.25rem;font-weight:700;color:#f0f0f5;margin:36px 0 14px;padding-bottom:8px;border-bottom:1px solid rgba(124,77,255,.15);}
.art-body p{margin-bottom:14px;line-height:1.85;color:#b8b8c8;}
.art-body strong{color:#e6e6ee;}
.cta-inline{background:rgba(124,77,255,.08);border:1px solid rgba(124,77,255,.2);border-radius:14px;padding:24px;margin:40px 0;text-align:center;}
.cta-inline h3{font-size:1.05rem;font-weight:700;margin-bottom:8px;}
.cta-inline p{font-size:.85rem;color:var(--muted);margin-bottom:16px;}
.btn-prim{background:linear-gradient(135deg,var(--p),#5c35cc);color:#fff;padding:11px 22px;border-radius:9px;font-weight:700;font-size:.85rem;display:inline-block;}
.faq{margin:40px 0 8px;}
.faq h2{font-size:1.25rem;font-weight:700;color:#f0f0f5;margin:0 0 16px;padding-bottom:8px;border-bottom:1px solid rgba(124,77,255,.15);}
.faq details{background:rgba(124,77,255,.05);border:1px solid rgba(124,77,255,.15);border-radius:10px;padding:14px 18px;margin-bottom:10px;}
.faq summary{font-weight:600;color:#e6e6ee;cursor:pointer;font-size:.95rem;list-style:none;}
.faq summary::-webkit-details-marker{display:none;}
.faq details p{margin:12px 0 0;color:#b8b8c8;line-height:1.8;font-size:.9rem;}
.back-blog{display:inline-flex;align-items:center;gap:8px;font-size:.85rem;color:var(--p2);padding:14px 0;}
footer{background:var(--bg2);border-top:1px solid var(--border);padding:24px 0;text-align:center;}
footer p{font-size:.75rem;color:#5a5a70;}
footer a{color:var(--p2);}
</style>"""

NAV_BLOCK = """<nav>
  <div class="nav-in">
    <a href="https://whitemoon.es/"><img class="nav-logo" src="/logo.png" alt="WhiteMoon" width="140" height="52"></a>
    <div style="display:flex;align-items:center;gap:14px;">
      <a href="https://whitemoon.es/blog/" style="font-size:.78rem;color:var(--muted);">&larr; Blog</a>
      <a href="https://wa.me/34643199580" class="nav-cta" target="_blank" rel="noopener">Contactar &rarr;</a>
    </div>
  </div>
</nav>"""

FOOTER_BLOCK = """<footer>
  <div class="wrap" style="max-width:960px;">
    <p>&copy; 2026 <a href="https://whitemoon.es/">WhiteMoon Agencia IA</a> &middot; Majadahonda, Madrid &middot; <a href="tel:643199580">643 199 580</a> &middot; <a href="/politica-privacidad/">Politica de Privacidad</a> &middot; <a href="/politica-cookies/">Politica de Cookies</a></p>
  </div>
</footer>"""

NOTA_AGENTE_IA = """<div style="background:rgba(124,77,255,0.08);border:1px solid rgba(124,77,255,0.2);border-left:3px solid #7c4dff;border-radius:12px;padding:16px 20px;margin-bottom:24px;font-size:14px;line-height:1.6;color:#b39dff;">
<strong style="color:#9d70ff;">Nota de WhiteMoon:</strong> Lo que muchos llaman "chatbot" hoy en dia es en realidad un <strong>Agente IA</strong>: una tecnologia mucho mas avanzada que responde, cualifica y actua de forma autonoma. En este articulo usamos ambos terminos para facilitar la busqueda, pero en WhiteMoon trabajamos exclusivamente con <strong>Agentes IA</strong>. <a href="/blog/agente-ia-vs-chatbot-diferencias/" style="color:#7c4dff;">Cual es la diferencia exacta? &rarr;</a>
</div>"""


def build_related(slug, index):
    """Devuelve 3 articulos relacionados del pool, excluyendo el actual."""
    pool = [r for r in RELATED_POOL if r[2].strip("/").split("/")[-1] != slug]
    picks = [pool[(index + i) % len(pool)] for i in range(3)]
    # dedup manteniendo orden
    seen, out = set(), []
    for p in picks:
        if p[2] not in seen:
            seen.add(p[2])
            out.append(p)
    i = 0
    while len(out) < 3 and i < len(pool):
        if pool[i][2] not in seen:
            seen.add(pool[i][2])
            out.append(pool[i])
        i += 1
    return out


def render_html(tema, data, date_iso, date_human, words, read_min, related, event_slug):
    slug = tema["slug"]
    url = f"{BASE_URL}/blog/{slug}/"
    categoria = tema["categoria"]

    title = clamp(data["titulo_seo"], 50).rstrip(" .") + " · WhiteMoon"
    if len(title) > 65:  # cinturon y tirantes
        title = clamp(data["titulo_seo"], 65 - len(" · WhiteMoon")) + " · WhiteMoon"
    meta_desc = clamp(data["intro"], 160)
    h1 = esc(data["h1"])

    # ── JSON-LD BlogPosting (headline = title exacto, description = meta exacto) ──
    blogposting = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": title,
        "description": meta_desc,
        "articleSection": categoria,
        "author": {"@type": "Person", "name": "Cristobal Martinez", "jobTitle": "Fundador & CEO",
                   "worksFor": {"@type": "Organization", "name": "WhiteMoon Agencia IA", "url": BASE_URL},
                   "sameAs": [BASE_URL]},
        "publisher": {"@type": "Organization", "name": "WhiteMoon Agencia IA", "url": BASE_URL},
        "datePublished": date_iso,
        "dateModified": date_iso,
        "wordCount": str(words),
        "mainEntityOfPage": {"@type": "WebPage", "@id": url},
        "url": url,
        "inLanguage": "es-ES",
    }
    # ── JSON-LD FAQPage: mismas preguntas que el DOM ──
    faqpage = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": f["pregunta"].strip(),
             "acceptedAnswer": {"@type": "Answer", "text": f["respuesta"].strip()}}
            for f in data["faqs"]
        ],
    }
    ld_blog = json.dumps(blogposting, ensure_ascii=False, indent=2)
    ld_faq = json.dumps(faqpage, ensure_ascii=False, indent=2)

    # ── Cuerpo del articulo ──
    body_parts = []
    n = len(data["secciones"])
    mid = max(1, n // 2)
    for i, sec in enumerate(data["secciones"]):
        body_parts.append(f"<h2>{esc(sec['h2'])}</h2>")
        for p in sec["parrafos"]:
            body_parts.append(f"<p>{esc(p)}</p>")
        if i == mid - 1:
            body_parts.append(
                '<div class="post-mid-cta" style="background:#111118;border:1px solid rgba(124,77,255,0.15);border-radius:14px;padding:24px 22px;margin:34px 0;text-align:center;">\n'
                f'  <p style="margin:0 0 16px;color:#f0f0f5;font-size:1rem;line-height:1.6;">{esc(data["cta_texto"])}</p>\n'
                f'  <button type="button" onclick="wmTrack&amp;&amp;wmTrack(\'click_blog_mid_{event_slug}\');document.getElementById(\'luna-btn\')?.click()" style="display:inline-block;padding:13px 26px;background:#7c4dff;color:#fff;border:0;border-radius:10px;font-family:inherit;font-weight:700;font-size:.95rem;cursor:pointer;">Habla con Orion &rarr;</button>\n'
                '</div>'
            )
    body_html = "\n".join(body_parts)

    # ── FAQ visible (acordeon) ──
    faq_items = "\n".join(
        f'      <details><summary>{esc(f["pregunta"])}</summary><p>{esc(f["respuesta"])}</p></details>'
        for f in data["faqs"]
    )
    faq_html = (
        '<section class="faq">\n'
        '      <h2>Preguntas frecuentes</h2>\n'
        f'{faq_items}\n'
        '    </section>'
    )

    # ── Relacionados ──
    rel_cards = "\n".join(
        f'      <a href="{u}" style="display:block;padding:14px 16px;margin-bottom:10px;background:rgba(124,77,255,.05);border:1px solid rgba(124,77,255,.15);border-radius:10px;text-decoration:none;color:inherit;">\n'
        f'        <div style="font-size:.65rem;letter-spacing:.1em;text-transform:uppercase;color:#9d70ff;font-weight:600;margin-bottom:4px;">{esc(cat)}</div>\n'
        f'        <div style="font-size:.95rem;color:#e6e6ee;font-weight:500;">{esc(tit)} &rarr;</div>\n'
        f'      </a>'
        for cat, tit, u in related
    )

    return f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)}</title>
<meta name="description" content="{esc_attr(meta_desc)}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<meta name="author" content="WhiteMoon Agencia IA">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{esc_attr(title)}">
<meta property="og:description" content="{esc_attr(meta_desc)}">
<meta property="og:url" content="{url}">
<meta property="og:type" content="article">
<meta property="og:locale" content="es_ES">
<meta property="article:author" content="WhiteMoon Agencia IA">
<meta property="article:published_time" content="{date_iso}T10:00:00+01:00">
<meta property="article:modified_time" content="{date_iso}T10:00:00+01:00">
<meta property="article:section" content="{esc_attr(categoria)}">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="{esc_attr(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{OG_IMAGE}">
<meta name="theme-color" content="#7c4dff">
<script type="application/ld+json">
{ld_blog}
</script>
<script type="application/ld+json">
{ld_faq}
</script>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet">
{STYLE_BLOCK}
  <script defer src="/assets/cookie-consent.js?v=2026052702"></script>
  <script defer src="/assets/wm-track.js?v=2026052801"></script>
<link rel="stylesheet" href="/assets/blog.css">
</head>
<body>

{NAV_BLOCK}

<main>
  <div class="wrap">
    <div class="breadcrumb">
      <a href="https://whitemoon.es/">WhiteMoon</a><span>&rsaquo;</span>
      <a href="https://whitemoon.es/blog/">Blog</a><span>&rsaquo;</span>
      {esc(clamp(data['titulo_seo'], 48))}
    </div>

    <article>
      <section class="post-hero">
        <div class="post-badge">{esc(categoria)}</div>
        <h1>{h1}</h1>
        <div class="post-meta">
          <span>{date_human}</span>
          <span class="post-meta-dot"></span>
          <span>{read_min} min de lectura</span>
          <span class="post-meta-dot"></span>
          <span>Cristobal Martinez &middot; WhiteMoon</span>
        </div>
      </section>

      <div class="art-intro">{esc(data['intro'])}</div>

      <div class="art-body">
{NOTA_AGENTE_IA}
{body_html}

    {faq_html}

        <div class="cta-inline">
          <h3>Quieres aplicarlo a tu negocio?</h3>
          <p>Demo gratuita sin compromiso. Operativo en 5-7 dias laborables. Sin permanencia. 643 199 580</p>
          <a href="https://wa.me/34643199580?text=Hola%20quiero%20info%20sobre%20Agentes%20IA" class="btn-prim" target="_blank" rel="noopener">Consultar con WhiteMoon &rarr;</a>
        </div>

        <section class="related-posts" style="margin-top:48px;padding-top:32px;border-top:1px solid rgba(124,77,255,.15);">
          <h2 style="font-size:1.15rem;font-weight:700;color:#f0f0f5;margin-bottom:18px;">Articulos relacionados</h2>
{rel_cards}
        </section>
        <a href="/blog/" class="back-blog">&larr; Volver al blog</a>
      </div>
    </article>
  </div>
</main>

{FOOTER_BLOCK}

<script src="/orion-widget.js?v=2026060801" defer></script>
</body>
</html>
"""


# ── Actualizacion de sitemap e indice ───────────────────────────────────────
def update_sitemap(entries, date_iso):
    """entries: lista de slugs. Inserta <url> antes de </urlset> si no existe."""
    with open(SITEMAP_FILE, encoding="utf-8") as fh:
        xml = fh.read()
    blocks = []
    for slug in entries:
        loc = f"{BASE_URL}/blog/{slug}/"
        if loc in xml:
            continue
        blocks.append(
            "  <url>\n"
            f"    <loc>{loc}</loc>\n"
            f"    <lastmod>{date_iso}</lastmod>\n"
            "    <changefreq>monthly</changefreq>\n"
            "    <priority>0.7</priority>\n"
            "  </url>\n"
        )
    if not blocks:
        return
    xml = xml.replace("</urlset>", "".join(blocks) + "</urlset>")
    with open(SITEMAP_FILE, "w", encoding="utf-8") as fh:
        fh.write(xml)


def update_blog_index(items):
    """items: lista de dicts {slug, title, categoria, excerpt, date_human, read_min, color}.
    Anade cada uno al schema Blog (blogPost) y como tarjeta visible, arriba del todo."""
    with open(BLOG_INDEX_FILE, encoding="utf-8") as fh:
        html_doc = fh.read()

    for it in items:
        url = f"{BASE_URL}/blog/{it['slug']}/"
        # 1) Entrada en el schema Blog (evita duplicado)
        if url not in html_doc:
            entry = f'    {{"@type": "BlogPosting", "headline": {json.dumps(it["title"], ensure_ascii=False)}, "url": "{url}"}},\n'
            html_doc = html_doc.replace('"blogPost": [\n', '"blogPost": [\n' + entry, 1)
        # 2) Tarjeta visible (evita duplicado)
        card_href = f'href="/blog/{it["slug"]}/"'
        if card_href not in html_doc:
            card = (
                f'\n  <a class="blog-card" href="/blog/{it["slug"]}/">\n'
                f'    <div class="blog-card-stripe blog-card-stripe--{it["color"]}"></div>\n'
                f'    <div class="blog-card-body">\n'
                f'      <span class="blog-card-tag">{esc(it["categoria"])}</span>\n'
                f'      <h2>{esc(it["title_short"])}</h2>\n'
                f'      <p class="blog-card-excerpt">{esc(it["excerpt"])}</p>\n'
                f'      <div class="blog-card-meta">\n'
                f'        <span>{it["date_human"]} &middot; {it["read_min"]} min</span>\n'
                f'        <span class="blog-card-cta">Leer &rarr;</span>\n'
                f'      </div>\n'
                f'    </div>\n'
                f'  </a>\n'
            )
            html_doc = html_doc.replace('<div class="blog-grid">\n', '<div class="blog-grid">\n' + card, 1)

    with open(BLOG_INDEX_FILE, "w", encoding="utf-8") as fh:
        fh.write(html_doc)


# ── Main ────────────────────────────────────────────────────────────────────
MESES = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]


def main():
    selftest = "--selftest" in sys.argv
    count_env = os.environ.get("BLOG_COUNT", "5")
    # en selftest permite  python blog_generator.py --selftest 2
    if selftest:
        extra = [a for a in sys.argv[1:] if a != "--selftest"]
        count = int(extra[0]) if extra else 2
    else:
        count = int(count_env)
    model = os.environ.get("ANTHROPIC_MODEL", DEFAULT_MODEL)

    temas = load_json(TEMAS_FILE)["temas"]
    ledger = load_json(LEDGER_FILE)
    usados = set(ledger.get("usados", []))

    pending = [t for t in temas if t["id"] not in usados][:count]

    now = now_madrid()
    date_iso = now.strftime("%Y-%m-%d")
    date_human = f"{now.day} {MESES[now.month]} {now.year}"

    published, errors = [], []
    sitemap_slugs, index_items = [], []

    if not pending:
        print("No hay temas nuevos que publicar.")
        save_json(LASTRUN_FILE, {"fecha": date_iso, "selftest": selftest, "published": [], "errors": []})
        return 0

    for idx, tema in enumerate(pending):
        try:
            data = canned_content(tema) if selftest else generate_content(tema, model)
            words = word_count(data)
            read_min = max(3, round(words / 200))
            event_slug = re.sub(r"[^a-z0-9]+", "_", tema["slug"])
            related = build_related(tema["slug"], idx)

            html_out = render_html(tema, data, date_iso, date_human, words, read_min, related, event_slug)
            out_dir = os.path.join(BLOG_DIR, tema["slug"])
            os.makedirs(out_dir, exist_ok=True)
            with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as fh:
                fh.write(html_out)

            title = clamp(data["titulo_seo"], 50).rstrip(" .") + " · WhiteMoon"
            if len(title) > 65:
                title = clamp(data["titulo_seo"], 65 - len(" · WhiteMoon")) + " · WhiteMoon"

            sitemap_slugs.append(tema["slug"])
            index_items.append({
                "slug": tema["slug"], "title": title,
                "title_short": clamp(data["h1"], 70),
                "categoria": tema["categoria"],
                "excerpt": clamp(data["excerpt"], 155),
                "date_human": date_human, "read_min": read_min,
                "color": STRIPE_COLORS[idx % len(STRIPE_COLORS)],
            })
            usados.add(tema["id"])
            published.append({"id": tema["id"], "slug": tema["slug"], "titulo": title,
                              "url": f"{BASE_URL}/blog/{tema['slug']}/"})
            print(f"OK  {tema['slug']}  ({words} palabras, {read_min} min)")
        except Exception as exc:  # noqa: BLE001 — un fallo no debe tumbar el resto
            errors.append({"id": tema["id"], "slug": tema["slug"], "error": f"{type(exc).__name__}: {exc}"})
            print(f"ERR {tema['slug']}: {exc}", file=sys.stderr)

    if index_items:
        update_sitemap(sitemap_slugs, date_iso)
        update_blog_index(index_items)

    # ledger
    ledger["usados"] = sorted(usados)
    if published:
        ledger.setdefault("publicaciones", []).append(
            {"fecha": date_iso, "ids": [p["id"] for p in published], "slugs": [p["slug"] for p in published]}
        )
    save_json(LEDGER_FILE, ledger)

    save_json(LASTRUN_FILE, {"fecha": date_iso, "selftest": selftest,
                             "published": published, "errors": errors})

    print(f"\nPublicados: {len(published)}  ·  Errores: {len(errors)}")
    return 0 if published or not pending else 1


if __name__ == "__main__":
    sys.exit(main())
