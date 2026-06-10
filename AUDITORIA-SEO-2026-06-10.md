# Auditoría SEO — whitemoon.es

**Fecha:** 2026-06-10
**Alcance:** SEO técnico, on-page, GEO/AEO y accesibilidad sobre 187 archivos HTML, `sitemap.xml`, `robots.txt` y `llms.txt`.
**Rol:** SEO Senior Auditor.

---

## Puntuación

| | Antes | Después |
|---|---|---|
| **Puntuación SEO estimada** | **7.6 / 10** | **9.2 / 10** |
| Errores críticos 🔴 | 2 | 0 |
| Warnings 🟡 | 7 categorías | 2 (deuda técnica, requiere tooling) |

La base ya era sólida (sitemap sin 404, JSON-LD válido, bots IA permitidos, GEO completo, catálogo coherente, precios correctos). La auditoría cerró los 2 críticos y todos los warnings accionables sin herramientas externas.

---

## Qué se encontró y qué se corrigió

### 🔴 Críticos (resueltos)

**C1 — FAQPage schema sin contenido visible en el DOM (10 páginas)** → **PR #368**
- 10 páginas tenían `FAQPage` en JSON-LD pero **0 preguntas renderizadas** en la página, incumpliendo las *Structured Data Guidelines* de Google.
- Solución: sección "Preguntas frecuentes" visible con acordeón nativo `<details>`, renderizando el **mismo texto exacto** del schema (self-contained, sin JS ni dependencia de CSS).
- Páginas: `orion`, `white-moon-system`, `auditoria-ia`, `coste-no-automatizar`, `atencion-cliente-ia`, `automatizacion-ventas`, `empresas-medianas-madrid`, `blog/agente-ia-vs-chatbot-diferencias`, `blog/cuanto-cuesta-ia-negocio`, `blog/roi-agente-ia-pymes-datos`.
- Verificado: `schema_q == summaries visibles` en las 10.

**C2 — Precio de producto retirado (Orion IA Calls · 1.499€) aún visible (3 blogs)** → **PR #367**
- `blog/que-es-agente-voz-ia-2026`: "1.499€ + 199€/mes (atención telefónica)" → **Orion IA Agent 999€ (agente de voz en tu web)**; FAQ JSON-LD sin "atención telefónica".
- `blog/orion-ia-agente-voz-24-7`: tabla coste "199-1.499€/mes" → **999€ + 199€/mes**.
- `blog/orion-ia-vs-recepcionista`: setup "999-1.499€" → **desde 999€**.
- Verificado: 0 `1.499€` ni "atención telefónica" en los 3.

### 🟡 Warnings (resueltos)

**W1 — Titles > 65 caracteres (82 páginas)** → **PR #370 + #371**
- 51 calculadoras al patrón `Calculadora [Tema] 2026 · WhiteMoon`; `auditoria-ia` 83→57.
- 30 titles de blog/landings reescritos a ≤65 (keyword + `· WhiteMoon`).
- `og:title`/`twitter:title` sincronizados.
- Verificado: **0 titles > 65** en todo el repo.

**W2 — Meta description > 160 (31 páginas)** → **PR #370 + #371**
- `sobre-nosotros` 222→148; 30 descripciones más acortadas a ≤160 (corte en frontera de frase); `og:description`/`twitter:description` sincronizados.
- Verificado: **0 meta descriptions > 160**.

**W3 — Imágenes sin `width`/`height` (CLS) (85 img)** → **PR #372**
- 79 `nav-logo` + 1 logo footer → `140×52`; 4 `team-photo` → `300×180`.
- Verificado: **0 `<img>` sin dimensiones** (salvo el modal JS `#tmPhoto`, de `src` vacío).

**W4 — `og:image` sin dimensiones (87 páginas)** → **PR #372**
- `og:image:width=1200` + `og:image:height=630` (todas usan `og-image.jpg`, formato OG estándar).
- Verificado: **0 páginas con `og:image` sin dimensiones**.

**W5 — `llms.txt` desactualizado** → **PR #369**
- Eliminados productos retirados (Orion IA Calls, Scale, Elite) y la descripción "atiende llamadas"; catálogo vigente (4 packs + Auditoría + Calculadora ITP Pro).
- Añadidas secciones "Artículos destacados" (10 artículos nuevos) y "Comparativas" (5 páginas).
- Verificado: todas las URLs existen físicamente.

**W6 — Páginas finas (<300 palabras)** → **PR #373**
- `servicios` 149→**447** palabras (guía "Cómo elegir tu servicio" + "Cómo trabajamos", con enlaces internos).
- `auditoria-ia` ya alcanzó **479** palabras gracias a la sección FAQ añadida en C1/#368 — no requirió cambios.

---

## Lo que ya estaba bien (no se tocó)

- **Sitemap:** 183 URLs, 0 que apunten a página inexistente; `scale/`, `elite/`, `orion-calls/` correctamente excluidos (son redirects). Prioridades coherentes (home 1.0, landings 0.8, blog 0.7).
- **robots.txt:** sintaxis válida; todos los bots IA permitidos (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, OAI-SearchBot, Applebot-Extended, meta-externalagent, Amazonbot, Bytespider, DuckAssistBot…).
- **JSON-LD:** 0 bloques inválidos en todo el repo.
- **og:image:** 0 apuntando a SVG (todos JPG).
- **FAQPage duplicados:** 0. **H1 múltiple:** 0. **Imágenes sin `alt`:** 0.
- **BreadcrumbList item 2 = "Agente IA"** en las 12 landings sectoriales.
- **Catálogo:** 0 menciones de Scale/Elite/Orion IA Calls como producto. Precios correctos (Spark 499€, Orion Agent 999€, Core 1.800€, Core RAG 3.200€).
- **Orion** (`orion/`, `orion-agent/`): sin referencias telefónicas.
- **GEO completo en home:** `geo.region`, `geo.placename`, `geo.position`, `ICBM`, `GeoCoordinates`. **hreflang** (`es` + `x-default`) sólo en home.
- **Organization/LocalBusiness:** `sameAs` completo, `addressLocality` Majadahonda, `addressRegion` Madrid, `telephone`.
- **Scripts:** todos con `defer`/`async`.

---

## Deuda técnica pendiente (no abordada — requiere tooling/CI)

Documentada también en `TECH-DEBT.md`.

1. **`icono.jpg` → `icono-80.webp`** (Lighthouse: "imágenes con tamaño correcto"). El `<img>` ya tiene `width/height` (sin CLS); falta la versión WebP 80×80. No se pudo generar en el entorno (sin `cwebp`/`convert`/`PIL`). No tocar `icono.jpg` (lo usa `orion-widget.js`).
   - Referencia: `cwebp -resize 80 80 -q 82 assets/images/icono.jpg -o assets/images/icono-80.webp`
2. **CSS sin usar en `assets/site.css` (~10 KB)** (Lighthouse: "reduce CSS sin usar"). GitHub Pages no permite purge server-side; resolver con PurgeCSS en build/CI. No se modifica a mano para evitar regresiones visuales.

## A confirmar (recomendación, no bloqueante)

- **Host de producción:** si es GitHub Pages, el archivo `_headers` (`Cache-Control: immutable`) se ignora y el caché lo gobiernan los `?v=` de los assets (ya presentes). Un host como Cloudflare Pages / Netlify aplicaría las cabeceras y permitiría redirecciones **301** reales en lugar de los `meta-refresh` actuales de `scale/`, `elite/`, `orion-calls/`.

---

## Pull Requests de la auditoría

| PR | Bloque | Descripción |
|---|---|---|
| #367 | C2 | Eliminar precio/mención de Orion IA Calls en 3 blogs |
| #368 | C1 | Sincronizar FAQPage schema con DOM (10 páginas) |
| #369 | W5 | Actualizar `llms.txt` (catálogo + artículos + comparativas) |
| #370 | W1+W2 | Acortar titles (calculadoras + auditoría) y meta desc `sobre-nosotros` |
| #371 | W1+W2 | Segundo lote: titles blog/landings + meta descriptions |
| #372 | W3+W4 | `width`/`height` en imágenes + `og:image:width/height` |
| #373 | W6 | Ampliar `/servicios/` a >300 palabras |
