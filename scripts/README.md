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
| `../.github/workflows/blog-generator.yml` | Orquesta: cron lunes 05:00 UTC (antes del SEO Guardian de las 07:00) + `workflow_dispatch`. |

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

## Anadir temas

Anade objetos al final de `temas` en `blog-temas.json` con `id`/`slug` nuevos (que no
existan ya en `/blog/`). El generador los ira cogiendo por orden cuando se agoten los actuales.
