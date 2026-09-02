#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera /prompts-ia-pymes/index.html a partir de prompts-ia-pymes/prompts.json.

Uso:  python scripts/build_prompts_page.py

prompts.json es la fuente de verdad: para cambiar la biblioteca se edita el JSON
y se vuelve a lanzar este script. El HTML no se edita a mano.


Las tarjetas se escriben ESTÁTICAS en el HTML (para que la página tenga
contenido sin JS: rastreadores de IA, Googlebot, JS bloqueado) y el mismo JSON
va embebido inline: el JS lo lee y vuelve a pintar la rejilla al cargar, así
que en runtime el JSON es la única fuente de verdad y no puede haber deriva.
"""
import html
import json
import os

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, "prompts-ia-pymes", "prompts.json")
OUT = os.path.join(REPO, "prompts-ia-pymes", "index.html")

data = json.load(open(SRC, encoding="utf-8"))
CATS = data["categorias"]
CTA = data["cta"]
TOTAL = sum(len(c["prompts"]) for c in CATS)

TITLE = "Prompts de IA para pymes (gratis) · WhiteMoon"
DESC = ("Biblioteca gratuita de prompts de IA para pymes: atención al cliente, "
        "ventas, marketing, email, operaciones y SEO. Copia, pega y adapta.")
URL = "https://whitemoon.es/prompts-ia-pymes/"
OG_DESC = ("18 prompts listos para copiar y pegar en ChatGPT, Claude o Gemini. "
           "Para el día a día de un negocio pequeño. Sin registro.")

FAQ = [
    ("¿Los prompts de esta página son gratis?",
     "Sí. Están en abierto, sin registro y sin dejar el email. Copia el que necesites, "
     "pégalo en tu herramienta de IA y adáptalo a tu negocio."),
    ("¿En qué herramientas de IA funcionan?",
     "En cualquier chat de IA generativa: ChatGPT, Claude, Gemini, Copilot o Perplexity. "
     "Están escritos en lenguaje natural, sin comandos ni sintaxis especial."),
    ("¿Tengo que cambiar algo antes de usarlos?",
     "Sí: todo lo que va entre corchetes. Cuanto más concreto seas con tu negocio, tu "
     "ciudad y tu cliente ideal, más útil será la respuesta que te devuelva la IA."),
    ("¿Qué diferencia hay entre usar prompts y tener un agente de IA?",
     "Un prompt lo ejecutas tú, a mano, cada vez que lo necesitas. Un agente de IA "
     "trabaja solo: atiende a quien entra en tu web, responde dudas y capta contactos "
     "las 24 horas sin que tengas que copiar y pegar nada."),
]


def esc(s):
    return html.escape(s, quote=True)


# ── JSON-LD ────────────────────────────────────────────────────────────────
ld_page = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Prompts de IA para pymes",
    "headline": data["titulo"],
    "description": DESC,
    "url": URL,
    "inLanguage": "es-ES",
    "isPartOf": {"@type": "WebSite", "url": "https://whitemoon.es/",
                 "name": "WhiteMoon Agencia IA"},
    "publisher": {"@type": "Organization", "name": "WhiteMoon Agencia IA",
                  "url": "https://whitemoon.es/"},
    "about": [{"@type": "Thing", "name": c["nombre"]} for c in CATS],
    "mainEntity": {
        "@type": "ItemList",
        "name": data["titulo"],
        "numberOfItems": TOTAL,
        "itemListElement": [
            {"@type": "ListItem", "position": i, "name": p["titulo"],
             "description": p["caso"]}
            for i, p in enumerate(
                (p for c in CATS for p in c["prompts"]), start=1)
        ],
    },
}
ld_bread = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "WhiteMoon",
         "item": "https://whitemoon.es/"},
        {"@type": "ListItem", "position": 2, "name": "Recursos",
         "item": "https://whitemoon.es/recursos/"},
        {"@type": "ListItem", "position": 3, "name": "Prompts de IA para pymes",
         "item": URL},
    ],
}
ld_faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
        {"@type": "Question", "name": q,
         "acceptedAnswer": {"@type": "Answer", "text": a}}
        for q, a in FAQ
    ],
}


def dumps(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


# ── Tarjetas estáticas ─────────────────────────────────────────────────────
cards = []
for cat in CATS:
    for i, p in enumerate(cat["prompts"], start=1):
        pid = "%s-%d" % (cat["id"], i)
        cards.append(
            '      <article class="pcard" data-cat="{cat}">\n'
            '        <span class="pcat">{catn}</span>\n'
            '        <h3 class="ptitle">{tit}</h3>\n'
            '        <p class="pcaso">{caso}</p>\n'
            '        <pre class="pcode" id="pc-{pid}">{prm}</pre>\n'
            '        <button type="button" class="pcopy" data-copy="pc-{pid}" '
            'data-cat="{cat}" data-pid="{pid}">'
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" '
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            '<rect x="9" y="9" width="12" height="12" rx="2"/>'
            '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>'
            '<span class="lbl">Copiar</span></button>\n'
            '      </article>'.format(
                cat=esc(cat["id"]), catn=esc(cat["nombre"]),
                tit=esc(p["titulo"]), caso=esc(p["caso"]),
                prm=esc(p["prompt"]), pid=pid)
        )
cards_html = "\n".join(cards)

pills = ['      <button type="button" class="pill is-on" data-filter="all" '
         'aria-pressed="true">Todas <span class="n">%d</span></button>' % TOTAL]
for c in CATS:
    pills.append(
        '      <button type="button" class="pill" data-filter="{id}" '
        'aria-pressed="false">{n} <span class="n">{k}</span></button>'.format(
            id=esc(c["id"]), n=esc(c["nombre"]), k=len(c["prompts"])))
pills_html = "\n".join(pills)

faq_html = "\n".join(
    '      <div class="faq-item"><div class="faq-q">{q}</div>'
    '<div class="faq-a">{a}</div></div>'.format(q=esc(q), a=esc(a))
    for q, a in FAQ)

json_inline = dumps(data)
assert "</" not in json_inline and "<!--" not in json_inline

HTML = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="keywords" content="prompts ia pymes, prompts chatgpt negocio, prompts para empresas, biblioteca de prompts español, prompts marketing pymes">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{ogdesc}">
<meta property="og:url" content="{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="WhiteMoon Agencia IA">
<meta property="og:image" content="https://whitemoon.es/assets/og/og-whitemoon.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:alt" content="WhiteMoon &middot; Agencia de IA">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{ogdesc}">
<meta name="twitter:image" content="https://whitemoon.es/assets/og/og-whitemoon.jpg">
<meta name="theme-color" content="#7c4dff">
<script type="application/ld+json">
{ldpage}
</script>
<script type="application/ld+json">
{ldbread}
</script>
<script type="application/ld+json">
{ldfaq}
</script>
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/site.css">
<script defer src="/assets/cookie-consent.js?v=2026072802"></script>
<script defer src="/assets/wm-track.js?v=2026060302"></script>
<style>
  :root{{--bg:#08080d;--bg2:#0e0e16;--card:#111118;--code:#0a0a11;
    --text:#f0f0f5;--muted:#9999b5;--p:#7c4dff;--p2:#9d70ff;--g:#00d4aa;
    --border:rgba(124,77,255,.22);--border-soft:rgba(124,77,255,.12);--max:1140px}}
  html,body{{background:var(--bg);color:var(--text)}}
  body{{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}}
  .pw{{max-width:var(--max);margin:0 auto;padding:0 28px}}

  /* HERO */
  .ph{{padding:118px 0 40px;position:relative;overflow:hidden}}
  .ph::before{{content:"";position:absolute;top:-240px;left:50%;transform:translateX(-50%);width:960px;height:560px;background:radial-gradient(ellipse at center,rgba(124,77,255,.13),transparent 62%);pointer-events:none}}
  .ph .pw{{position:relative;z-index:2}}
  .peyebrow{{display:inline-flex;align-items:center;gap:10px;font-size:.7rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:#c4b3ff;margin-bottom:20px}}
  .peyebrow::before{{content:"";width:24px;height:1px;background:linear-gradient(90deg,transparent,#7c4dff)}}
  h1{{font-family:'Sora','Inter',sans-serif;font-size:clamp(2rem,4.6vw,3.3rem);font-weight:700;letter-spacing:-.03em;line-height:1.08;margin:0 0 18px;max-width:16ch}}
  .pintro{{font-size:1.05rem;color:var(--muted);line-height:1.68;margin:0;max-width:64ch}}
  .pstats{{display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}}
  .pstat{{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border:1px solid var(--border-soft);border-radius:99px;background:var(--card);font-size:.78rem;color:var(--muted)}}
  .pstat b{{color:var(--text);font-weight:600}}
  .pstat .dot{{width:6px;height:6px;border-radius:50%;background:var(--g)}}

  /* TOOLBAR */
  .ptools{{position:sticky;top:66px;z-index:60;background:rgba(8,8,13,.92);backdrop-filter:blur(14px);border-bottom:1px solid var(--border-soft);padding:16px 0 14px;margin-top:34px}}
  .psearch{{position:relative;max-width:440px;margin-bottom:14px}}
  .psearch svg{{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--muted);pointer-events:none}}
  .psearch input{{width:100%;padding:11px 14px 11px 40px;border-radius:10px;border:1px solid var(--border-soft);background:var(--card);color:var(--text);font-family:inherit;font-size:.9rem}}
  .psearch input::placeholder{{color:#7d7d99}}
  .psearch input:focus{{outline:none;border-color:var(--p);box-shadow:0 0 0 3px rgba(124,77,255,.18)}}
  .ppills{{display:flex;flex-wrap:wrap;gap:8px}}
  .pill{{display:inline-flex;align-items:center;gap:7px;padding:8px 14px;border-radius:99px;border:1px solid var(--border-soft);background:var(--card);color:var(--muted);font-family:inherit;font-size:.82rem;font-weight:500;cursor:pointer;transition:border-color .15s,color .15s,background .15s}}
  .pill:hover{{border-color:var(--border);color:var(--text)}}
  .pill:focus-visible{{outline:2px solid var(--p2);outline-offset:2px}}
  .pill .n{{font-size:.72rem;color:#7d7d99;font-variant-numeric:tabular-nums}}
  .pill.is-on{{background:var(--p);border-color:var(--p);color:#fff}}
  .pill.is-on .n{{color:rgba(255,255,255,.78)}}
  .pcount{{margin:18px 0 0;font-size:.8rem;color:var(--muted);font-variant-numeric:tabular-nums}}

  /* GRID */
  .pgrid{{display:grid;grid-template-columns:repeat(2,1fr);gap:18px;padding:22px 0 8px;align-items:start}}
  .pcard{{display:flex;flex-direction:column;gap:10px;padding:24px;background:var(--card);border:1px solid var(--border-soft);border-radius:14px;position:relative;overflow:hidden}}
  .pcard::before{{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--p),transparent);opacity:0;transition:opacity .25s ease}}
  .pcard:hover{{border-color:var(--border)}}
  .pcard:hover::before{{opacity:.55}}
  .pcard[hidden]{{display:none}}
  .pcat{{font-size:.66rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--p2)}}
  .ptitle{{font-family:'Sora','Inter',sans-serif;font-size:1.05rem;font-weight:600;letter-spacing:-.015em;line-height:1.32;margin:0;color:var(--text)}}
  .pcaso{{font-size:.85rem;color:var(--muted);line-height:1.6;margin:0}}
  .pcode{{margin:6px 0 0;padding:16px 18px;background:var(--code);border:1px solid var(--border-soft);border-radius:10px;font-family:ui-monospace,SFMono-Regular,'SF Mono',Menlo,Consolas,'Liberation Mono',monospace;font-size:.8rem;line-height:1.7;color:#e2e2ee;white-space:pre-wrap;overflow-wrap:anywhere}}
  .pcopy{{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;margin-top:4px;padding:9px 16px;border-radius:9px;border:1px solid var(--border);background:transparent;color:var(--p2);font-family:inherit;font-size:.82rem;font-weight:600;cursor:pointer;transition:background .15s,border-color .15s,color .15s}}
  .pcopy svg{{width:15px;height:15px}}
  .pcopy:hover{{background:rgba(124,77,255,.1);border-color:var(--p)}}
  .pcopy:focus-visible{{outline:2px solid var(--p2);outline-offset:2px}}
  .pcopy.is-ok{{color:var(--g);border-color:rgba(0,212,170,.45);background:rgba(0,212,170,.08)}}
  .pempty{{padding:56px 24px;text-align:center;color:var(--muted);font-size:.92rem;border:1px dashed var(--border-soft);border-radius:14px;margin:22px 0}}
  .pempty b{{color:var(--text);display:block;font-family:'Sora','Inter',sans-serif;font-size:1.05rem;margin-bottom:8px}}
  .pempty[hidden]{{display:none}}
  .sr{{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}}

  /* FAQ */
  .pfaq{{padding:72px 0 8px;border-top:1px solid var(--border-soft);margin-top:56px}}
  .ph2{{font-family:'Sora','Inter',sans-serif;font-size:clamp(1.5rem,2.8vw,2rem);font-weight:600;letter-spacing:-.025em;line-height:1.18;margin:0 0 26px;color:var(--text)}}
  .faq-wrap{{max-width:760px}}
  .faq-item{{padding:20px 0;border-bottom:1px solid var(--border-soft)}}
  .faq-q{{font-family:'Sora','Inter',sans-serif;font-size:1rem;font-weight:600;color:var(--text);margin-bottom:8px;letter-spacing:-.01em}}
  .faq-a{{font-size:.92rem;color:var(--muted);line-height:1.7}}

  /* CTA */
  .pcta{{padding:72px 0 96px}}
  .pcta-box{{padding:52px 40px;text-align:center;border:1px solid var(--border);border-radius:20px;background:radial-gradient(ellipse at 50% 0%,rgba(124,77,255,.14),transparent 66%),var(--bg2);position:relative;overflow:hidden}}
  .pcta-box::before{{content:"";position:absolute;top:0;left:50%;transform:translateX(-50%);width:60%;height:1px;background:linear-gradient(90deg,transparent,rgba(124,77,255,.6),transparent)}}
  .pcta-box h2{{font-family:'Sora','Inter',sans-serif;font-size:clamp(1.55rem,3.2vw,2.15rem);font-weight:700;letter-spacing:-.025em;line-height:1.15;margin:0 0 14px;color:var(--text)}}
  .pcta-box p{{font-size:1rem;color:var(--muted);line-height:1.68;margin:0 auto 30px;max-width:62ch}}
  .pcta-btn{{display:inline-flex;align-items:center;gap:9px;padding:14px 28px;background:linear-gradient(135deg,#7c4dff,#9d70ff);color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:.96rem;box-shadow:0 14px 36px rgba(124,77,255,.32);transition:transform .15s ease,box-shadow .2s ease}}
  .pcta-btn:hover{{transform:translateY(-1px);box-shadow:0 18px 44px rgba(124,77,255,.42)}}
  .pcta-btn svg{{width:16px;height:16px;transition:transform .15s ease}}
  .pcta-btn:hover svg{{transform:translateX(3px)}}

  .pfooter{{padding:32px 0;text-align:center;font-size:.78rem;color:#8f8fa8;border-top:1px solid var(--border-soft)}}
  .pfooter a{{color:var(--p2);text-decoration:none}}
  .pfooter a:hover{{text-decoration:underline}}

  @media(max-width:900px){{
    .pgrid{{grid-template-columns:1fr}}
    .ph{{padding:100px 0 32px}}
    .ptools{{top:60px}}
    .pcta-box{{padding:44px 26px}}
  }}
  @media(max-width:600px){{
    .pw{{padding:0 18px}}
    .ph{{padding:92px 0 26px}}
    .pintro{{font-size:.98rem}}
    .pcard{{padding:20px}}
    .pcode{{font-size:.78rem;padding:14px 15px}}
    .ptools{{padding:12px 0 10px}}
    .psearch{{max-width:none}}
    .pfaq{{padding-top:56px}}
    .pcta{{padding:56px 0 72px}}
    .pcta-box{{padding:36px 20px}}
  }}
  @media(prefers-reduced-motion:reduce){{
    .pcard,.pcard::before,.pcta-btn,.pcta-btn svg,.pcopy,.pill{{transition:none}}
    .pcta-btn:hover{{transform:none}}
  }}
</style>
</head>
<body>
<a href="#main-content" class="skip-link">Saltar al contenido</a>

<nav class="navbar"><div class="wrap">
  <a href="/" class="nav-logo"><picture><source srcset="/logo.webp" type="image/webp"><img src="/logo.png" alt="WhiteMoon" width="140" height="52" loading="eager" decoding="async" style="height:52px;width:auto"></picture></a>
  <div class="nav-right">
    <a href="/demos/" class="nav-link">Demo</a>
    <a href="/casos/" class="nav-link">Casos</a>
    <a href="/recursos/" class="nav-link" style="color:#f0f0f5">Recursos</a>
    <a href="/precios/" class="nav-link">Precios</a>
    <a href="/blog/" class="nav-link">Blog</a>
    <a href="/auditoria-geo-seo/" class="nav-cta">Auditoría gratis →</a>
  </div>
</div></nav>

<main id="main-content">

  <!-- HERO -->
  <section class="ph">
    <div class="pw">
      <p class="peyebrow">Recursos gratis</p>
      <h1>Prompts de IA para pymes</h1>
      <p class="pintro">{intro}</p>
      <div class="pstats">
        <span class="pstat"><span class="dot"></span><b>{total}</b> prompts</span>
        <span class="pstat"><b>{ncats}</b> categorías</span>
        <span class="pstat">Sin registro y sin dejar el email</span>
      </div>
    </div>
  </section>

  <!-- FILTROS -->
  <section class="ptools" aria-label="Filtrar prompts">
    <div class="pw">
      <div class="psearch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/></svg>
        <label for="pq" class="sr">Buscar un prompt</label>
        <input type="search" id="pq" placeholder="Buscar: reseña, presupuesto, newsletter…" autocomplete="off">
      </div>
      <div class="ppills" role="group" aria-label="Categorías">
{pills}
      </div>
    </div>
  </section>

  <!-- REJILLA -->
  <section class="pw" aria-labelledby="t-lista">
    <h2 id="t-lista" class="sr">Listado de prompts</h2>
    <p class="pcount" id="pcount" role="status" aria-live="polite">{total} prompts</p>
    <div class="pgrid" id="pgrid">
{cards}
    </div>
    <div class="pempty" id="pempty" hidden>
      <b>Ningún prompt coincide con tu búsqueda</b>
      Prueba con otra palabra o vuelve a «Todas».
    </div>
  </section>

  <!-- FAQ -->
  <section class="pfaq" aria-labelledby="t-faq">
    <div class="pw">
      <h2 class="ph2" id="t-faq">Preguntas frecuentes</h2>
      <div class="faq-wrap">
{faq}
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="pcta">
    <div class="pw">
      <div class="pcta-box">
        <h2>{ctatit}</h2>
        <p>{ctatxt}</p>
        <a href="{ctaurl}" class="pcta-btn" id="pcta">{ctabtn}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>
      </div>
    </div>
  </section>

</main>

<footer class="pfooter">
  <div class="pw">
    © 2026 <a href="/">WhiteMoon · Agencia de IA</a> · Majadahonda, Madrid ·
    <a href="/recursos/">Recursos</a> · <a href="/blog/">Blog</a> ·
    <a href="/aviso-legal/">Aviso Legal</a> ·
    <a href="/politica-privacidad/">Política de Privacidad</a> ·
    <a href="/politica-cookies/">Política de Cookies</a>
  </div>
</footer>

<p class="sr" id="pcopy-live" role="status" aria-live="polite"></p>

<script type="application/json" id="wm-prompts">{jsondata}</script>
<script>
(function(){{
  'use strict';

  var grid   = document.getElementById('pgrid');
  var empty  = document.getElementById('pempty');
  var count  = document.getElementById('pcount');
  var input  = document.getElementById('pq');
  var live   = document.getElementById('pcopy-live');
  var pills  = [].slice.call(document.querySelectorAll('.pill'));

  var data;
  try {{ data = JSON.parse(document.getElementById('wm-prompts').textContent); }}
  catch (e) {{ return; }}   // el HTML estático ya está pintado: no rompemos nada

  // Índice plano {{id, cat, catNombre, titulo, caso, prompt, busqueda}}
  var ITEMS = [];
  data.categorias.forEach(function (cat) {{
    cat.prompts.forEach(function (p, i) {{
      ITEMS.push({{
        id: cat.id + '-' + (i + 1),
        cat: cat.id,
        catNombre: cat.nombre,
        titulo: p.titulo,
        caso: p.caso,
        prompt: p.prompt,
        busqueda: norm([cat.nombre, p.titulo, p.caso, p.prompt].join(' '))
      }});
    }});
  }});

  // Búsqueda insensible a tildes y mayúsculas.
  function norm(s) {{
    s = String(s).toLowerCase();
    return s.normalize ? s.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '') : s;
  }}

  var COPY_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="9" y="9" width="12" height="12" rx="2"/>' +
    '<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

  function el(tag, cls, txt) {{
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  }}

  function card(it) {{
    var art = el('article', 'pcard');
    art.setAttribute('data-cat', it.cat);
    art.appendChild(el('span', 'pcat', it.catNombre));
    art.appendChild(el('h3', 'ptitle', it.titulo));
    art.appendChild(el('p', 'pcaso', it.caso));
    var pre = el('pre', 'pcode', it.prompt);
    pre.id = 'pc-' + it.id;
    art.appendChild(pre);
    var btn = el('button', 'pcopy');
    btn.type = 'button';
    btn.setAttribute('data-copy', pre.id);
    btn.setAttribute('data-cat', it.cat);
    btn.setAttribute('data-pid', it.id);
    btn.innerHTML = COPY_SVG + '<span class="lbl">Copiar</span>';
    art.appendChild(btn);
    return art;
  }}

  var filtro = 'all';

  function pintar() {{
    var q = norm(input.value.trim());
    var visibles = ITEMS.filter(function (it) {{
      if (filtro !== 'all' && it.cat !== filtro) return false;
      return !q || it.busqueda.indexOf(q) !== -1;
    }});
    var frag = document.createDocumentFragment();
    visibles.forEach(function (it) {{ frag.appendChild(card(it)); }});
    grid.innerHTML = '';
    grid.appendChild(frag);
    empty.hidden = visibles.length > 0;
    count.textContent = visibles.length === ITEMS.length
      ? ITEMS.length + ' prompts'
      : visibles.length + ' de ' + ITEMS.length + ' prompts';
  }}

  pills.forEach(function (b) {{
    b.addEventListener('click', function () {{
      filtro = b.getAttribute('data-filter');
      pills.forEach(function (o) {{
        var on = o === b;
        o.classList.toggle('is-on', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      }});
      pintar();
    }});
  }});

  var t;
  input.addEventListener('input', function () {{
    clearTimeout(t);
    t = setTimeout(pintar, 120);
  }});

  // ── Copiar ───────────────────────────────────────────────────────────
  function legacyCopy(texto) {{
    var ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:-9999px;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try {{ ok = document.execCommand('copy'); }} catch (e) {{ ok = false; }}
    document.body.removeChild(ta);
    return ok;
  }}

  function feedback(btn, ok) {{
    var lbl = btn.querySelector('.lbl');
    if (!lbl) return;
    if (btn._t) clearTimeout(btn._t);
    lbl.textContent = ok ? 'Copiado' : 'Selecciónalo y copia';
    btn.classList.toggle('is-ok', ok);
    if (live) live.textContent = ok ? 'Prompt copiado al portapapeles' : 'No se ha podido copiar';
    btn._t = setTimeout(function () {{
      lbl.textContent = 'Copiar';
      btn.classList.remove('is-ok');
    }}, 2200);
  }}

  grid.addEventListener('click', function (ev) {{
    var btn = ev.target.closest ? ev.target.closest('.pcopy') : null;
    if (!btn) return;
    var pre = document.getElementById(btn.getAttribute('data-copy'));
    if (!pre) return;
    var texto = pre.textContent;

    if (typeof wmTrack === 'function') {{
      wmTrack('copy_prompt', {{
        prompt_id: btn.getAttribute('data-pid'),
        categoria: btn.getAttribute('data-cat')
      }});
    }}

    if (navigator.clipboard && window.isSecureContext) {{
      navigator.clipboard.writeText(texto).then(
        function () {{ feedback(btn, true); }},
        function () {{ feedback(btn, legacyCopy(texto)); }}
      );
    }} else {{
      feedback(btn, legacyCopy(texto));
    }}
  }});

  // El CTA final: un único evento GA4 (wmTrack ya encola en dataLayer).
  var cta = document.getElementById('pcta');
  if (cta) {{
    cta.addEventListener('click', function () {{
      if (typeof wmTrack === 'function') {{
        wmTrack('click_cta_desde_prompts', {{ origen: 'prompts-ia-pymes' }});
      }}
    }});
  }}

  // Repinta desde el JSON embebido: a partir de aquí el JSON manda.
  pintar();
}})();
</script>
<script src="/orion-widget.js?v=2026072102" defer></script>
</body>
</html>
""".format(
    title=esc(TITLE), desc=esc(DESC), ogdesc=esc(OG_DESC), url=URL,
    ldpage=dumps(ld_page), ldbread=dumps(ld_bread), ldfaq=dumps(ld_faq),
    intro=esc(data["intro"]), total=TOTAL, ncats=len(CATS),
    pills=pills_html, cards=cards_html, faq=faq_html,
    ctatit=esc(CTA["titulo"]), ctatxt=esc(CTA["texto"]),
    ctaurl=esc(CTA["url"]), ctabtn=esc(CTA["boton"]),
    jsondata=json_inline,
)

with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
    fh.write(HTML)

print("escrito:", OUT, len(HTML), "bytes")
print("title:", len(TITLE), "chars |", TITLE)
print("desc :", len(DESC), "chars")
print("ogdesc:", len(OG_DESC))
