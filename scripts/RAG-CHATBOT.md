# Chatbot de texto con RAG de whitemoon.es

Segunda burbuja flotante del sitio. Responde con el contenido **real** de
whitemoon.es, cita la página de la que sale la respuesta y deriva al
Departamento Comercial. Convive con Orion (voz, Retell) sin tocarlo.

## Piezas

| Pieza | Qué hace |
|---|---|
| `wm-chat-widget.js` (raíz) | La burbuja + panel. La inyecta `orion-widget.js`, que ya carga diferido. |
| `supabase/functions/wm-rag-chat` | Endpoint público del chat. Embebe la pregunta, recupera y responde con Claude. `verify_jwt: false`. |
| `supabase/functions/wm-rag-ingest` | Indexa páginas. `verify_jwt: true`. |
| `supabase/functions/wm-rag-lead` | Inserta el lead en `leads_web` (origen `rag-web`) y avisa por Telegram. `verify_jwt: false`. |
| `supabase/migrations/20260815120000_rag_whitemoon.sql` | Tablas `wm_rag_chunks` / `wm_rag_paginas` y la RPC `buscar_rag_whitemoon`. |
| `scripts/rag_ingest_whitemoon.py` | Driver de la ingesta. |
| `../.github/workflows/rag-reingest.yml` | Re-ingesta automática tras cada deploy de Pages. |

## Aislamiento respecto al Core RAG de clientes

El contenido del sitio vive en **`wm_rag_chunks`**, una tabla propia. No
comparte nada con `rag_documentos` / `rag_archivos`, que son las de los
clientes, y `buscar_rag`, `rag-chat` y `rag-ingest` no se han tocado.

Hay dos razones:

1. **Obligatoria.** `rag_documentos.embedding` es `vector(1536)` (dimensión
   de OpenAI `text-embedding-3-small`) y `voyage-3-lite` produce 512.
   Ningún modelo de Voyage da 1536, así que compartir la tabla exigiría
   migrar la columna de los clientes.
2. **Deseable.** El aislamiento deja de depender de acordarse de filtrar
   por `cliente_id`. `buscar_rag_whitemoon` no recibe namespace y
   `wm-rag-chat` no acepta `cliente_id`: no hay parámetro que manipular
   para alcanzar datos de un cliente.

Ambas tablas tienen RLS activa **sin políticas**: solo entra el
`service_role` de las Edge Functions. Desde el navegador no existen.

> Efecto colateral del punto 1 que conviene saber: `rag-ingest` intenta
> Voyage primero, así que hoy falla con `expected 1536 dimensions, not 512`.
> Por eso `rag_documentos` está vacía. No se ha arreglado aquí porque toca
> infraestructura de clientes; es un trabajo aparte.

## Por qué la ingesta es *pull* y no *push*

`wm-rag-ingest` **no acepta texto**. Acepta una ruta, la valida contra el
`sitemap.xml` real del sitio y descarga la página ella misma.

`verify_jwt: true` no protege nada aquí: acepta cualquier JWT válido del
proyecto y la anon key es pública (está en `assets/calc-lead.js` y en la
migración de cron). Si la función aceptara texto libre, cualquiera podría
inyectar contenido falso que el chatbot citaría después como si fuera del
sitio. Tirando del sitio en vivo, lo peor que puede hacer un tercero es
pedir que se reindexe una página que ya existe.

Y para que eso tampoco cueste dinero, `wm_rag_paginas` guarda el hash del
texto: si no cambió, no se genera ni un embedding.

## Re-ingesta

**Automática.** `rag-reingest.yml` se encadena al workflow *Deploy GitHub
Pages*, espera 2 minutos a que Cloudflare suelte los bytes viejos y pasa el
sitio entero. Como es incremental, solo se re-embebe lo que cambió.

**A mano:**

```bash
python scripts/rag_ingest_whitemoon.py                  # sitio entero (incremental)
python scripts/rag_ingest_whitemoon.py --only /precios/ # una sola página
python scripts/rag_ingest_whitemoon.py --force          # reindexa aunque no haya cambios
python scripts/rag_ingest_whitemoon.py --prune          # quita del RAG lo que ya no está en el sitemap
python scripts/rag_ingest_whitemoon.py --stats          # estado del índice
```

⚠️ La función lee el **sitio publicado**, no el repo. Si se lanza antes de
que el deploy esté servido, reindexa la versión vieja. Tras un deploy
manual, esperar unos minutos o purgar Cloudflare primero.

## Colocación de las dos burbujas

Abajo-derecha hay una columna de tres, de abajo arriba:

1. `#luna-widget` — burbuja redonda de Orion (voz)
2. `#orion-cta-fab` — pill "Habla con Orion ahora"
3. `#wm-chat-fab` — burbuja del chat de texto

`orion-widget.js` publica su geometría en variables CSS
(`--orion-right/-bottom/-btn/-gap`) y el chat se coloca a partir de ellas
más la altura **real** del pill, medida en runtime con `ResizeObserver`
(`--wm-chat-pill`). Si el pill cambia de tamaño, la burbuja se aparta sola:
no pueden solaparse por construcción.

En móvil (≤599px) el panel se abre como hoja casi completa, así que no
depende de la altura de esa columna. `#wm-sticky-cta` (solo en la home,
abajo-izquierda) queda en el lado contrario.

## Captación de leads

El widget **no adivina** los datos del texto del modelo: los recoge con un
formulario explícito ("Que te llamen del Departamento Comercial"). El
system prompt le dice al bot que no pida nombre ni teléfono por chat y que
invite a ese botón — si no, el visitante los escribiría en la conversación
y no llegarían a nadie.

El envío va a `wm-rag-lead`, que inserta con `service_role` y avisa por
Telegram. **El navegador no ve ninguna clave** (a diferencia de
`assets/calc-lead.js`, que inserta con la anon key a la vista).

Payload a `leads_web`: `nombre`, `telefono`, `sector`, `interes`,
`mensaje` (con las últimas preguntas del visitante y la página), `origen`
= `rag-web`, `fecha`.
