# WhiteMoon Web — Contexto para Claude Code

## Stack
- HTML estático + CSS + JS vanilla
- GitHub Pages
- Supabase para leads_web
- Sin frameworks, sin npm

## Reglas
- Git:
  - Features nuevas → siempre rama + PR
  - Fixes críticos de producción (chatbot roto, leads sin capturar, web caída) → commit directo a main permitido
  - Cambios de 1-3 líneas sin riesgo → commit directo a main permitido
  - Nunca push directo a main para: cambios grandes, nuevas funcionalidades, cambios de arquitectura
- **Catálogo comercial vigente — TRES productos.** No hay más.
  - **Spark** (`/spark/`) — agente de IA conversacional instalado en la web que el cliente YA tiene.
  - **Core Spark Web** (`/core/`) — web nueva con el agente dentro, más SEO y GEO/AEO montados desde el día 1. Para quien NO tiene web.
  - **Agente IA Citas** (`/agente-ia-citas/`) — agente de reservas para negocios de cita previa (peluquería, estética, uñas, barbería, taller, fisio, podología, dental…): el cliente reserva solo por QR o con un enlace, o desde el agente embebido en su web, sin llamadas. Panel de citas (alta manual, mover/cancelar, importar) y reseñas por WhatsApp que envía el propio negocio en un clic: **no** usa la API de WhatsApp Business ni envía nada automático. No garantiza ventas.
  - Los tres: **propuesta a medida, sin permanencia**. Spark y Core Spark Web: operativo en 5-7 días laborables.
  - Producto suelto: **Auditoría GEO IA** (`/auditoria-geo-ia/`) — pago único, informe en 24h. En web se dice "Pago único · Sin permanencia", **sin cifra**.
- **CERO PRECIO EN WEB.** La web no publica tarifa en ningún soporte: ni texto visible, ni `<meta>`, ni JSON-LD (`price`/`priceRange`/`lowPrice`/`highPrice`), ni JavaScript. El precio se cierra en una llamada.
  - Fórmula estándar: **"Propuesta a medida, sin permanencia."**
  - `/precios/` **ya no es la fuente de verdad**: hoy es un stub meta-refresh a `/`. No hay página de tarifa, así que no hay dónde "ir a comprobar el precio" — simplemente no se escribe.
  - Únicas excepciones: el `price:"0"` de las herramientas gratuitas (calculadoras, `/auditoria-geo-seo/`) y el `priceRange:"€€"` simbólico del `LocalBusiness` en `/contacto/` y `/electricistas-madrid/`.
- **RETIRADOS del catálogo comercial** — no mencionar como producto en venta, ni en copy, ni en JSON-LD, ni en el prompt de ningún agente:
  Orion / agente de voz · WhiteMoon 360 · Core RAG · Mini Core · Core Orion · Orion IA Agent · Pack Ads · Calculadora ITP Pro · Scale · Elite · Orbit · Gestoría IA · Orion IA Calls.
  - Redirecciones vivas: `/scale/`, `/elite/`, `/pack-ads/`, `/precios/`, `/servicios/`, `/recursos/`, `/mini-core/`, `/core-rag/`, `/core-orion/`, `/whitemoon-360/`, `/automatizaciones/` → `/`; `/orion-calls/` → `/orion-agent/`.
  - Un redirect tiene **dos mitades**: el stub meta-refresh Y el alta en `IGNORED_DIRS` de `seo_guardian.py`. Sin la segunda, el check 5 bloquea el PR por "0 H1".
  - El check 9 del Guardian falla si "Scale", "Elite", "Orion IA Calls", "Orbit", "Gestoría IA" o "Pack Ads" aparecen en texto visible. Los demás retirados **no los vigila nadie**: hay que cazarlos a mano.
  - `/calculadora-itp/` y `/calculadora-itp-vivienda/` son **herramientas públicas gratuitas y siguen vivas**. Lo retirado es el producto "Calculadora ITP Pro" (el SaaS de pago). No confundir.

  > **NOTA TÉCNICA — `onboarding_clientes.pack` (Supabase).** Las claves de pack de los productos retirados **siguen vivas** para los clientes ya instalados. Son histórico operativo, no catálogo de venta: no se borran, no se renombran y no se usan para generar copy comercial ni para inferir qué se vende hoy. Si un cliente instalado tiene `pack = 'core_orion'`, eso describe lo que tiene contratado, no lo que ofrecemos.

- Permanencia: ningún producto tiene permanencia. 30 días de aviso para cancelar.
- Laura IA NUNCA recomienda Core Spark Web si el cliente ya tiene web (→ Spark).
- Sin testimonios ficticios.
- Sin cifras de rendimiento inventadas: nada de "+X% de conversión", "recuperan la inversión en X días" ni "media de nuestros clientes" si no hay una fuente que se pueda enseñar. Si el dato no existe, el número lo pone el usuario en un input y se etiqueta como supuesto suyo (así funciona la calculadora de `/precio-agente-ia/` y, desde los PR #762/#763, las de `/coste-no-automatizar/`, `/calculadora-ahorro-automatizacion/`, `/calculadora-horas-ahorradas-ia/`, `/calculadora-no-shows-clinicas/` y `/calculadora-perdidas-restaurante/`).
- **Nada de "#1 en ChatGPT" ni "los primeros en Grok".** Lo que sí es cierto y se puede decir: **"recomendados por ChatGPT y Grok (citas verificadas, no posición #1)"**. Los asistentes no tienen ranking posicional y la metodología no soporta ese claim. Hay capturas desde septiembre de 2026: citar la frase con su fecha, sin adjuntar la imagen (enseña precios y "voz", ambos retirados).
- Fundada en 2025.
- Descripción de Core Spark Web: "Web profesional + chatbot IA por texto + SEO y GEO/AEO. Tu negocio online, automatizado y visible en Google, ChatGPT y Grok desde el día 1." Incluye web con diseño personalizado, dominio el primer año, chatbot IA 24/7 por texto, sistema de reservas, SEO técnico completo, GEO/AEO, captura de leads → WhatsApp y responsive. Operativo en 5-7 días, sin permanencia, **propuesta a medida**.

## Cifras de precio prohibidas — y qué vigila REALMENTE el Guardian

Como la web ya no publica tarifa, **cualquier** cifra de precio de producto es un error.
Estas son las tarifas viejas que han estado publicadas y no deben reaparecer:

### A · Las 6 que el Guardian SÍ bloquea

`4.500€` · `8.500€` · `2.899€` · `1.800€` · `3.200€` · `999€`

Son la lista `BAD_PRICES` **literal** de `seo_guardian.py`. Los checks 8 y 13 las buscan
en el texto visible de todas las páginas y **bloquean el PR**. No hay que hacer nada más.

### B · Lista MANUAL — el Guardian NO las vigila

Nadie las para. Hay que grepearlas a mano en cada PR que toque copy, JSON-LD o JS.

**Tarifas antiguas (setup):** `499€` · `599€` · `799€` · `899€` · `1.499€` · `1.899€` · `2.499€`
**Tarifas antiguas (cuota):** `99€/mes` · `199€/mes` · `299€/mes` · `349€/mes` · `449€/mes`
**Productos retirados:** `3.500€` · `6.500€` · `299€` · `149€`

Grep de referencia para esta lista:

```bash
grep -rnE "(499|599|799|899|1\.?499|1\.?899|2\.?499|3\.?500|6\.?500|299|149) ?€|(99|199|299|349|449) ?€ ?/ ?mes" --include=*.html --include=*.js . | grep -v "Claude outputs"
```

**Verificar SIEMPRE con contexto antes de tocar nada.** El patrón que confirma que es una
tarifa de producto y no otra cosa es **`\d+€\s*\+\s*\d+€/mes`** (setup + cuota juntos).
Los números sueltos dan muchísimos falsos positivos — ver la lista de abajo.

**Por eso no se amplía `BAD_PRICES`:** meter `99`, `149`, `199`, `299` o `499` como cadena
literal reventaría de falsos positivos; son subcadenas de cifras legítimas por todo el sitio
(el `199` del teléfono, los `1499`/`1999` cc del BOE, el `z-index:499`…). Si algún día se
amplía, tiene que ser con el patrón de contexto, nunca con el número suelto.

**Falsos positivos conocidos — NO son precios, no tocarlos:**
- `34643199580` y `643 199 580` — el teléfono de WhatsApp contiene `199`. Sale ~4 veces por página (launcher + footer).
- `z-index:499` en `/electricistas-madrid/`.
- Tramos del BOE en `/calculadora-itp/`: `[[999,45],[1499,60],[1999,90]]` son centímetros cúbicos.
- `co2 <= 199` g/km en `/calculadora-impuesto-matriculacion/`; `Ley 38/1992` en toda esa página.
- `diasCotizados < 1800` en `/calculadora-prestacion-paro/`, y los tipos legales 70 % / 60 % / IPREM.
- Cuota RETA, IVA 10 %, SS 6,35 %, IBI 1 % y demás constantes fiscales de las calculadoras.
- `33.500 €` en `/calculadora-ingresos-reales-autonomo/` contiene `3.500` como subcadena. Mismo problema con cualquier importe que acabe en una de las cifras vigiladas.
- Los importes de ejemplo de las calculadoras: son supuestos que introduce el usuario.

**Dónde NO mira nadie:** los stubs de redirección están en `IGNORED_DIRS`, así que el
Guardian **no revisa su `<meta name="description">`** — y esa descripción sí la sirve
Google. Al retirar un producto hay que limpiar también el meta del stub, no solo la página
viva.

## Nada de precios ni de claims cableados en JavaScript

**Ningún precio ni claim de rendimiento cableado en JS de cara al cliente, ni en `webmcp.js`.**

`seo_guardian.py` hace `soup(['script','style']).extract()` antes de escanear: **el Guardian
no mira dentro de `<script>` ni de los `.js`**. Todo lo que viva ahí es invisible para los
checks 8, 9 y 13 y para cualquier auditoría de texto visible. Así sobrevivieron meses la
tarifa retirada en `assets/home.js` (incluido un `1.800€` que está en `BAD_PRICES`), el
`WM_BASE = 199 + 499/12` de `/coste-no-automatizar/` y varias constantes de eficacia.

**En todo PR que toque JS, verificar a mano:**

```bash
# precios de producto en JS (.js + <script> inline)
grep -rnE "[0-9][0-9.]*\s?€|€\s?/\s?mes|puesta en marcha|precio de entrada" --include=*.js --include=*.html . | grep -v "Claude outputs"

# constantes de eficacia cableadas
grep -rnE "\*\s?0\.[0-9]+|[Rr]educci[óo]n [0-9]+%|se amortiza" --include=*.js --include=*.html . | grep -v "Claude outputs"
```

Reglas para el JS:
- Si una constante mueve el resultado que ve el usuario, **la pone el usuario** en un input
  y se declara a la vista. Nada de `EFICACIA = .65` escondido.
- **`assets/webmcp.js` es la superficie que leen los asistentes de IA.** Un precio ahí lo
  repiten durante meses aunque la tarifa cambie. Respuesta fija: *"Propuesta a medida, sin
  permanencia. La cerramos en una llamada."* Hoy el fichero no contiene ni un símbolo `€`;
  que siga así.

> **Mejora futura pendiente:** extender `seo_guardian.py` con un check 17 que extraiga los
> `.js` y los `<script>` no-JSON-LD y les pase `BAD_PRICES` más un patrón de tarifa con
> contexto. Mientras no exista, esto es responsabilidad de quien revisa el PR.

## Captación de leads (chatbot · Supabase `leads_web`) — REGLA FIJA
Aplica a todos los flujos, presentes y futuros:
- Todo `startCapture()` debe pasar el `sector` detectado por el bot.
- Todo `finishCapture()` debe llamar a `saveLead()`.
- `saveLead()` siempre incluye `sector` + `mensaje` además de `nombre` y `telefono`.
- Payload completo enviado a `leads_web`: `nombre`, `telefono`, `sector`, `interes`, `mensaje`, `origen`, `fecha` (ISO).
- Campo `origen`: `data.origen || 'whitemoon.es'`
  → default: `'whitemoon.es'`
  → sobreescribible por flujo (ej: `'chatbot-agentes-ia'`)
  → retrocompatible: flujos sin `origen` explícito siguen enviando `'whitemoon.es'`
- Si el envío a Supabase falla → `console.warn`, NUNCA se interrumpe el flujo del usuario.

## Edge Functions — Regla crítica
SIEMPRE desplegar con --no-verify-jwt:
supabase functions deploy <nombre> --no-verify-jwt --project-ref mlaqtniujnvfxcvcourm
NUNCA desplegar sin --no-verify-jwt o el chatbot público dejará de funcionar.

## Skills activas
- /spec antes de cualquier nueva funcionalidad
- /review antes de mergear
- /build para implementación incremental

## SKILLS WHITEMOON
Repo de skills: https://github.com/NexusForgeIA/WHITEMOON-SKILLS-CLAUDE

Cargar al inicio de sesión:
curl -fsSL https://raw.githubusercontent.com/NexusForgeIA/WHITEMOON-SKILLS-CLAUDE/main/CLAUDE.md -o ~/.claude/CLAUDE.md

Skills disponibles:
- skills/seo-geo-aeo/SKILL.md
- skills/chatbot/SKILL.md
- skills/supabase/SKILL.md
- skills/ui-design/SKILL.md
- skills/git-flow/SKILL.md

## SKILLS DEL SISTEMA
Skills disponibles en el entorno de ejecución (`/mnt/skills/`). Claude Code
puede leerlas y usarlas cuando la tarea lo requiera.

### Públicas — documentos y archivos
- /mnt/skills/public/docx/SKILL.md — crear y editar documentos Word (.docx)
- /mnt/skills/public/pdf/SKILL.md — crear, manipular y rellenar PDFs
- /mnt/skills/public/pdf-reading/SKILL.md — leer y extraer contenido de PDFs
- /mnt/skills/public/pptx/SKILL.md — crear y editar presentaciones PowerPoint (.pptx)
- /mnt/skills/public/xlsx/SKILL.md — crear y editar hojas de cálculo Excel (.xlsx)
- /mnt/skills/public/file-reading/SKILL.md — leer y extraer contenido de archivos diversos

### Públicas — diseño y producto
- /mnt/skills/public/frontend-design/SKILL.md — diseño y construcción de frontend
- /mnt/skills/public/product-self-knowledge/SKILL.md — conocimiento del producto Claude/Anthropic

### Examples — creación y construcción
- /mnt/skills/examples/skill-creator/SKILL.md — crear nuevas skills
- /mnt/skills/examples/web-artifacts-builder/SKILL.md — construir artefactos web interactivos
- /mnt/skills/examples/mcp-builder/SKILL.md — construir servidores MCP
- /mnt/skills/examples/canvas-design/SKILL.md — diseño sobre canvas
- /mnt/skills/examples/algorithmic-art/SKILL.md — arte algorítmico/generativo
