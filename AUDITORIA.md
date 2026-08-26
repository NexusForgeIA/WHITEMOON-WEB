# Auditoría técnica — whitemoon.es

**Fecha:** 2026-08-26 · **PR:** `fix/auditoria-tecnica-schema`
**Alcance:** 309 HTML en el repo → **297 páginas reales** + 12 stubs de redirect
(meta-refresh, excluidos de todos los conteos). `.agents/` queda fuera: son
assets de skills instaladas, no páginas del sitio.

Herramientas: `seo_guardian.py` (los 16 checks, sitio completo) y un script de
un solo uso, `scripts/audit_once.py`, para lo que el guardian no mira. El
script se borra al cerrar el PR; este documento se queda.

---

## a) Resumen del SEO Guardian

**Antes:** 🔴 0 críticos · 🟡 1 warning
**Después:** 🔴 0 críticos · 🟡 0 warnings — **16/16 en verde**

| Check | Sev | Antes | Después |
|---|---|---|---|
| 1 · title ≤ 65 c | 🔴 | 0 | 0 |
| 2 · meta description ≤ 160 c | 🔴 | 0 | 0 |
| 3 · JSON-LD válido | 🔴 | 0 | 0 |
| 4 · og:image en JPG/PNG (no SVG) | 🔴 | 0 | 0 |
| 5 · H1 único por página | 🔴 | 0 | 0 |
| 6 · imágenes sin `alt` | 🔴 | 0 | 0 |
| 7 · imágenes sin `width`/`height` | 🔴 | 0 | 0 |
| 8 · precios incorrectos en páginas de packs | 🔴 | 0 | 0 |
| 9 · productos retirados en texto visible | 🔴 | 0 | 0 |
| 10 · sitemap vs archivos físicos | 🟡 | **1** | **0** ✅ |
| 11 · enlaces rotos en `llms.txt` | 🔴 | 0 | 0 |
| 12 · FAQPage en JSON-LD sin DOM visible | 🟡 | 0 | 0 |
| 13 · precios retirados en texto visible | 🔴 | 0 | 0 |
| 14 · cifras ambiguas | 🟡 | 0 | 0 |
| 15 · reseñas en structured data sin fuente | 🔴 | 0 | 0 |
| 16 · FAQPage que no coincide con el DOM | 🔴 | 0 | 0 |

El único hallazgo del guardian era el check 10:
`electricistas-madrid/index.html` existía como fichero pero no tenía URL en
`sitemap.xml`. Corregido.

---

## b) Lo que el guardian NO cubre

### Ya estaba bien — no se ha tocado nada

Esto se sospechaba roto y **no lo estaba**. Verificado con herramienta, no de
memoria:

| Comprobación | Resultado |
|---|---|
| Titles duplicados entre páginas | **0 grupos** — los 297 titles son únicos |
| Meta descriptions duplicadas | **0 grupos** |
| Meta descriptions vacías o ausentes | **0** |
| Titles > 65 c | **0** |
| Metas > 160 c | **0** |
| Canonical ausente | **0** |
| Canonical no autorreferente | **0** |
| `article:modified_time` ≠ `dateModified` del JSON-LD | **0** |

Los canonicals y las fechas están **limpios**. Las 297 páginas tienen canonical
y todas apuntan a su propia URL. No hay una sola discrepancia de fecha entre
Open Graph y JSON-LD.

> Nota sobre los canonicals "raros": los 12 stubs de redirect apuntan su
> canonical a la URL destino (`blog/n8n-claude-api-automatizacion/` →
> `/blog/`). Eso es correcto y deliberado — llevan `noindex, follow` y
> `meta http-equiv="refresh"`. No son un fallo.

### Fallos reales encontrados y corregidos

#### 1. Copyright del footer — 10 formatos distintos

El script confirmó **10 cadenas diferentes** conviviendo:

| Antes | Páginas |
|---|---|
| `© 2025-2026 WhiteMoon Agencia de IA …` | 152 |
| `© 2026 WhiteMoon Agencia IA …` | 53 |
| `© 2025 WhiteMoon Agencia de IA …` | **41** ← año caducado |
| `© 2026 Reformas Madrid …` | 41 |
| `© 2025-<span id="yr">2026</span> …` | 1 (home) |
| `© <span id="yr"></span> WhiteMoon Agencia IA …` | 2 ← **span vacío** |
| `© 2026 WhiteMoon · Todos los derechos reservados` | 1 |
| (sin línea de copyright) | 5 |

Dos fallos de fondo, no solo cosméticos:

- **41 páginas seguían diciendo "© 2025"** en agosto de 2026.
- **`automatizaciones/` y `gestotrafic/` tenían `<span id="yr"></span> vacío`**
  y lo rellenaban por JS. Los crawlers no ejecutan JS: veían `© WhiteMoon…`,
  sin año ninguno.

**Corregido:** las **250 páginas de marca WhiteMoon** renderizan ahora
`© 2026 WhiteMoon · Agencia de IA · …`, conservando íntegro el resto del footer
(Majadahonda, Ver precios, Blog, Aviso Legal, WhatsApp, teléfono…).

Cómo se hizo, para que conste: **solo se han modificado nodos de texto**. No se
ha añadido, quitado ni re-anidado una sola etiqueta, y los `<span id="yr">` se
han conservado — `assets/home.js:5` hace
`document.getElementById('yr').textContent = …` **sin null-check**, así que
borrar el span rompería el JS de la home entera. Los dos spans vacíos se han
prerrellenado con `2026` para que el año esté en el HTML servido; su JS sigue
funcionando igual.

#### 2. Ocho titles sin marca

De 297 páginas, 8 no llevaban "WhiteMoon" **en ninguna forma** en el `<title>`.
Se les ha añadido la marca conservando el contenido descriptivo y el precio
(el precio es territorio del PR 2 y no se ha tocado). Todos por debajo de 65 c:

| Página | Antes | Después | c |
|---|---|---|---|
| `agencia-ia-boadilla/` | Agencia IA Boadilla · Chatbots y Agentes IA desde 499€ | Agencia IA Boadilla · Chatbots y agentes desde 499€ · WhiteMoon | 63 |
| `agencia-ia-centro-madrid/` | Agencia IA Centro de Madrid · Chatbots y Agentes IA desde 499€ | Agencia IA Centro de Madrid · Agentes desde 499€ · WhiteMoon | 60 |
| `agencia-ia-chamberi-madrid/` | Agencia IA Chamberí · Chatbots y Agentes IA desde 499€ | Agencia IA Chamberí · Chatbots y agentes desde 499€ · WhiteMoon | 63 |
| `agencia-ia-collado-villalba/` | Agencia IA Collado Villalba · Chatbots y Agentes IA desde 499€ | Agencia IA Collado Villalba · Agentes desde 499€ · WhiteMoon | 60 |
| `agencia-ia-madrid-centro/` | Agencia IA Madrid Centro · Chatbots y Agentes IA desde 499€ | Agencia IA Madrid Centro · Agentes desde 499€ · WhiteMoon | 57 |
| `calculadora-impuesto-matriculacion/` | Calculadora Impuesto Matriculación 2026 · Coches y Motos · IEDMT | Calculadora impuesto matriculación 2026 · IEDMT · WhiteMoon | 59 |
| `chatbot-ia-talleres-madrid/` | Chatbot IA para talleres en Madrid · Citas 24/7 | Chatbot IA para talleres en Madrid · Citas 24/7 · WhiteMoon | 59 |
| `mini-core/` | Pack Mini Core · Landing y agente IA para autónomos | Pack Mini Core · Landing y agente IA para autónomos · WhiteMoon | 63 |

`og:title` y `twitter:title` se han sincronizado **solo donde ya eran espejo
exacto del `<title>`**. En `mini-core/` el `og:title` es independiente y ya
llevaba la marca: se ha dejado como estaba.

#### 3. Sitemap

`electricistas-madrid/` añadido (`lastmod 2026-08-03`, tomado de su último
commit). El XML valida y pasa de 300 a **301 URLs**. Sin URLs huérfanas en
ninguna de las dos direcciones.

---

## c) TODO — pendiente de decisión, NO tocado

### 1. Titles que no terminan literalmente en "· WhiteMoon" — 82 restantes

Ninguno es un fallo evidente. Se dejan porque cambiarlos tiene coste de CTR en
páginas que ya rankean, y el commit `a3e5f5a` ("rescate de CTR en 7 páginas de
página 1") es reciente. Desglose:

**a) Otra marca — 44 páginas. Recomendación: no tocar nunca.**
43 de `reformas-madrid/` + `gestotrafic/`. Son marcas distintas dirigidas a
otro público ("Reformas en Getafe | Presupuesto Gratis 24h"). Meterles
"· WhiteMoon" sería un error de posicionamiento, no una corrección. Sus
footers también se han dejado con `© 2026 Reformas Madrid`.

**b) Llevan la marca, con otro separador — 38 páginas. Decisión tuya.**
Todas contienen "WhiteMoon"; lo que cambia es la forma:

| Forma | Páginas | Ejemplo |
|---|---|---|
| `\| WhiteMoon` | 15 | `Chatbot IA para Academias y Centros de Estudio \| WhiteMoon` |
| `\| WhiteMoon Madrid` | 8 | `Chatbot IA para Inmobiliarias \| WhiteMoon Madrid` |
| `\| WhiteMoon Majadahonda` | 1 | `Chatbot IA para Clínicas Dentales \| WhiteMoon Majadahonda` |
| `\| WhiteMoon 360` | 1 | `Automatización con IA para empresas \| WhiteMoon 360` |
| marca al principio o en medio | 13 | `WhiteMoon vs Tidio 2026: Agente IA vs Live Chat · Madrid` |

Los 13 del último grupo son en su mayoría comparativas que **abren** con
"WhiteMoon vs X" — ahí la marca delante es lo correcto y forzar un sufijo la
duplicaría. Los otros 25 son un `|` en vez de un `·`, y varios pierden
"Madrid"/"Majadahonda" si se normalizan. **Dime si quieres que unifique los 25
y con qué criterio geográfico.**

### 2. Cinco páginas sin línea de copyright

`blog/index.html` · `calculadora-itp/` · `calculadora-nomina/` ·
`chatbot-abogados-ia-majadahonda/` · `reformas-madrid/calculadora/`

Llevan la marca en el footer por otra vía (`<div class="footer-logo">`, o
"Construido por WhiteMoon Agencia IA"). No se ha añadido copyright porque
supone insertar markup nuevo, no cambiar una cadena. **¿Se lo ponemos?**

### 3. Veinte páginas con `dateModified` y sin `article:modified_time`

No es un desajuste (los que tienen ambos coinciden al 100 %): es que a 20
páginas les falta el Open Graph. Sin impacto en el rich result; sí lo tiene
para algunos scrapers. Añadirlo es mecánico si lo quieres.

### 4. `#b44dff` fuera de paleta — 99 ficheros

Aparece como color de enlace en footers y CTAs. **No es un color WhiteMoon**:
la paleta es `--p #7c4dff` y `--p2 #9d70ff`. Además `#b44dff` sobre `#08080d`
no es el tono que usa el resto del sitio, así que hay dos púrpuras distintos
conviviendo. No se ha tocado en este PR (es cambio visual, no técnico). Merece
un PR propio — y recordar que para **texto** el que cumple AA es `--p2`
(`#9d70ff`, 5.70:1); `--p` se queda para iconos y bordes.

---

## Qué NO entra en este PR

Contenido de marketing, precios y claims — eso es el PR 2. En concreto se ha
dejado intacto el "desde 499€" de los titles de `agencia-ia-*` (499€ es el
setup de Spark, correcto en la tarifa 2026) y toda la prosa de las landings.
