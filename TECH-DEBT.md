# Deuda técnica — optimización PageSpeed/Lighthouse

Pendientes que requieren herramientas no disponibles en el entorno de
edición actual (sin salida a internet ni utilidades de imagen). Resolver
en local o en CI.

## 1. Logo `icono.jpg` sin versión optimizada (Lighthouse: "imágenes con tamaño correcto")
- `/assets/images/icono.jpg` es 209×210 px y se muestra a 44×44 px en
  `index.html` (ya con `width`/`height` explícitos, sin CLS).
- **Pendiente:** generar `/assets/images/icono-80.webp` (WebP, 80×80 px) y
  actualizar el `src` del `<img>` de la brand bar en `index.html`.
- **No tocar** `icono.jpg`: lo usa `orion-widget.js` (y otros repos).
- Comando de referencia: `cwebp -resize 80 80 -q 82 assets/images/icono.jpg -o assets/images/icono-80.webp`

## 2. CSS sin usar en `assets/site.css` (Lighthouse: "reduce CSS sin usar", ~10 KB)
- GitHub Pages no permite purga de CSS en servidor.
- **Pendiente:** purgar reglas no usadas en build/CI (p. ej. PurgeCSS) o
  dividir `site.css` por plantilla. No se modifica manualmente para evitar
  regresiones visuales.

## Caché real en producción (medido 2026-07-21 — no es deuda, es referencia)

Corrige una creencia anterior de este documento: **no hay caché de 1 año**.

- `whitemoon.es` es GitHub Pages detrás de Cloudflare. **Todo** (HTML,
  `/assets/*`, `/*.js`, imágenes, incluso un 404) se sirve con
  `Cache-Control: max-age=14400` (4 h) y `server: cloudflare`.
- El `_headers` de este repo es formato Netlify/Cloudflare Pages: **GitHub Pages
  lo ignora**. No aplica `immutable` ni `max-age=31536000`. Se conserva por si
  algún día se migra de host.
- **Un reemplazo in-place** (misma ruta y mismo nombre de fichero) se propaga
  solo en ≤4 h. No hay que bumpear el `?v=` ni tocar el HTML.
- Bumpear el `?v=` sirve **solo** para forzar propagación inmediata: es
  opcional, nunca obligatorio, y no hace falta hacerlo en las ~229 páginas.
- Para propagación inmediata: purgar el caché de Cloudflare, o cache-bust
  puntual con `?x=` al verificar (`?x=<timestamp>` y comparar `content-length`
  contra el fichero local).
- Si tras un deploy la URL sin query devuelve los bytes viejos un rato mientras
  la misma URL con `?x=` ya trae los nuevos, **no es un deploy fallido**: es el
  edge con `age` < 14400.

## Resuelto en `feat/pagespeed-fixes`
- robots.txt: directiva inválida `LLMs:` → comentario `# LLMs:`.
- Caché: `?v=` añadido a `site.css` en `index.html` (opcional — ver
  "Caché real en producción" más abajo; no era necesario).
- Logos del ticker (Anthropic, Cal.com, GitHub): de `<img>` externos
  (hotlink Wikimedia/cal.com, sin caché ni `width`) a texto estilizado,
  consistente con ElevenLabs/Supabase/Retell. Elimina las peticiones
  externas y los avisos de tamaño de imagen.
- Accesibilidad: jerarquía de encabezados corregida (footer `h4`→`h3`,
  sin salto h2→h4). Verificado: sin `<a>` sin nombre ni `<img>` sin `alt`.
