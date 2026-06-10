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

## Resuelto en `feat/pagespeed-fixes`
- robots.txt: directiva inválida `LLMs:` → comentario `# LLMs:`.
- Caché: `?v=` añadido a `site.css` en `index.html` (los `_headers` ya
  marcan `/assets/*` como `immutable`, 1 año).
- Logos del ticker (Anthropic, Cal.com, GitHub): de `<img>` externos
  (hotlink Wikimedia/cal.com, sin caché ni `width`) a texto estilizado,
  consistente con ElevenLabs/Supabase/Retell. Elimina las peticiones
  externas y los avisos de tamaño de imagen.
- Accesibilidad: jerarquía de encabezados corregida (footer `h4`→`h3`,
  sin salto h2→h4). Verificado: sin `<a>` sin nombre ni `<img>` sin `alt`.
