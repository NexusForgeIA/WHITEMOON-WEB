# Generador automatico de blog SEO

Agente que cada **lunes temprano** genera artculos de blog con la Claude API y los
publica respetando la proteccion de rama (rama -> PR -> SEO Guardian -> auto-merge).

## Piezas

| Archivo | Que hace |
|---|---|
| `blog-temas.json` | Banco de ~30 temas SEO (id, slug, titulo, keyword, sector, categoria). |
| `blog-ledger.json` | Temas ya publicados (`usados`) para no repetir. |
| `blog_generator.py` | Genera el contenido (Claude API, JSON estructurado), renderiza el HTML replicando el articulo de referencia, actualiza `sitemap.xml` y `blog/index.html`, marca el ledger. |
| `blog_notify.py` | Aviso por Telegram (titulos publicados / guardian fallido / error). |
| `gbp_generator.py` | Por cada articulo del lote genera una publicacion para **Google Business Profile** (formato "novedad": titulo <=58, texto local honesto, CTA + enlace real, idea de imagen, zona) y la envia por Telegram. **Sin API de Google**, sin cifras inventadas. |
| `../.github/workflows/blog-generator.yml` | Orquesta: cron lunes 05:00 UTC (antes del SEO Guardian de las 07:00) + `workflow_dispatch`. Ejecuta `gbp_generator.py` como paso final si el blog se fusiona. |
| `../.github/workflows/gbp-posts.yml` | `workflow_dispatch` manual: genera/reenvia las publicaciones GBP del ultimo lote (lee el ledger). Util para probar tono y formato. |

## Como funciona

1. Coge los `BLOG_COUNT` (por defecto 5) primeros temas no usados.
2. Por cada tema pide a Claude solo el **contenido** (intro, secciones, FAQs...). El HTML
   lo maqueta el propio script, garantizando que pasa el SEO Guardian:
   - title <= 65 con `· WhiteMoon`, meta description <= 160, canonical propio.
   - `og:image` en JPG (`/og-image.jpg`), nunca SVG.
   - 1 solo `<h1>`; sin `<img>` en el cuerpo (evita fallos de alt/width/height).
   - JSON-LD `BlogPosting` (headline = title exacto, description = meta exacto) + `FAQPage`
     con las mismas preguntas que el acordeon `<details>` visible.
   - Terminologia "Agente IA" (nunca "Chatbot IA"). Espanol de Espana, sin emojis.
   - Prohibido inventar cifras, casos o testimonios (regla en el system prompt).
3. Crea rama `bot/blog-AAAA-MM-DD`, abre PR **con el PAT** (`GH_PAT`) para que el check
   `seo-guardian-pr` se dispare, y hace `--squash` automatico si pasa en verde.
   Si falla, deja el PR abierto y avisa por Telegram.

## Secrets necesarios (repo Actions)

| Secret | Uso | Estado |
|---|---|---|
| `ANTHROPIC_API_KEY` | Generacion con Claude API | **anadir** |
| `GH_PAT` | Abrir/fusionar PR y disparar el check (PAT clasico, scopes `repo` + `workflow`) | **anadir** |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Aviso Telegram | ya existen |

Variable opcional `ANTHROPIC_MODEL` (repo Variables) para cambiar el modelo
(por defecto `claude-opus-4-8`; usa `claude-haiku-4-5` para abaratar).

## Uso manual / pruebas

```bash
# Prueba local SIN API (contenido de ejemplo) — util para validar el render:
python scripts/blog_generator.py --selftest 2
python seo_guardian.py            # debe dar 0 errores criticos

# Ejecucion real (necesita ANTHROPIC_API_KEY en el entorno):
BLOG_COUNT=1 python scripts/blog_generator.py
```

Desde GitHub: pestaa **Actions -> Blog Generator -> Run workflow** (input `count`).

### Publicaciones GBP

```bash
# Prueba local (imprime, no envia) del ultimo lote publicado:
python scripts/gbp_generator.py --source ledger --limit 2 --dry-run
```

Desde GitHub: **Actions -> GBP Posts (manual) -> Run workflow** (input `limit`).
Envia por Telegram (usa `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID`). Cada lunes se
ejecuta solo tras publicarse el blog.

## Anadir temas

Anade objetos al final de `temas` en `blog-temas.json` con `id`/`slug` nuevos (que no
existan ya en `/blog/`). El generador los ira cogiendo por orden cuando se agoten los actuales.

---

# Navbar unificada (`nav_rebuild.py`)

El header del sitio **no se edita a mano pagina a pagina**. La fuente de verdad es:

| Archivo | Que es |
|---|---|
| `assets/wm-nav.css` | Estilos de la barra, del cajon movil y del bloque de navegacion del footer. |
| `assets/wm-nav.js` | Desplegable de Servicios, cajon movil, enlace activo y tracking del CTA. Se carga con `defer` y no hay ningun `onclick` inline en el markup. |
| `scripts/nav_rebuild.py` | Reescribe el `<nav>` de todas las paginas de paseo con el markup canonico e inyecta el bloque `.wm-fnav` en su footer. |

Menu: **Servicios** (desplegable corto: Orion IA + "Ver todos los servicios") ·
**Demos** · **Precios** · **Recursos**, mas un unico CTA destacado
("Auditoria GEO/SEO Gratis"). "Agendar reunion" es un enlace de texto secundario.
Nosotros, Blog, Casos y los 8 enlaces del antiguo desplegable "Soluciones" viven
en el bloque del footer.

```bash
python scripts/nav_rebuild.py --check   # no escribe, solo informa
python scripts/nav_rebuild.py           # aplica (es idempotente)
python seo_guardian.py                  # 0 criticos
```

Universo: la casta 1 del repo (paginas con menu real). Quedan fuera, a proposito,
las landings de conversion, el microsite `reformas-madrid/` y los micrositios con
nav de anclas propias (`EXCLUDE` dentro del script). En esas paginas el script
solo degrada el boton morado de cal.com a enlace de texto, para que no compita
con su CTA propio.

Para cambiar el menu se toca el script (`nav_html()` / `FOOTER_NAV`) y se
reejecuta; nunca los HTML uno a uno.
