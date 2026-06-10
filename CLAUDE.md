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
- Catálogo vigente: SOLO 4 packs → Spark · Orion IA Agent · Core · Core RAG. Scale y Elite están RETIRADOS (no mencionar como productos; /scale/ y /elite/ redirigen a /precios/). Orion IA Calls también retirado (/orion-calls/ redirige a /orion-agent/).
- Plazos: "5-7 días laborables" para Spark, Orion IA Agent, Core y Core RAG.
- Precios actuales:
  - Spark: 499€ setup + 199€/mes · Sin permanencia · Laura IA en web existente
  - Orion IA Agent: 999€ setup + 199€/mes · Sin permanencia · Agente IA conversacional 24/7 embebido en tu web
  - Core: 1.800€ setup + 199€/mes · Sin permanencia · Web nueva + Laura IA (para quien NO tiene web)
  - Core RAG: 3.200€ setup + 349€/mes · Sin permanencia · Laura IA con docs propios (100 docs, 1.000 consultas/mes) — SIN web
  - Auditoría: 899€ pago único
- Permanencia: ningún pack tiene permanencia. 30 días de aviso para cancelar.
- Core RAG: SIN diseño web incluido — solo agente IA RAG
- Laura IA NUNCA recomienda Core si el cliente ya tiene web (→ Spark)
- Laura IA NUNCA recomienda RAG sin documentos propios del cliente
- Oferta Spark: primer mes GRATIS hasta el 26 mayo
- Sin testimonios ficticios
- Sin menciones a Orbit o packs obsoletos
- Fundada en 2025
- Descripción del Pack Core: "Web profesional + chatbot IA + SEO y GEO/AEO. Tu negocio online, automatizado y visible en Google, ChatGPT y Grok desde el día 1." (incluye web con diseño personalizado, dominio el primer año, chatbot IA 24/7, sistema de reservas, SEO técnico completo, GEO/AEO, captura de leads → WhatsApp, responsive; 1.800€ setup + 199€/mes, operativo en 5-7 días, sin permanencia)

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
