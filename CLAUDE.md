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
- Catálogo vigente: Pack Mini Core · Spark · Orion IA Agent · Core Spark Web · Core Orion · WhiteMoon 360 · Core RAG, más tres productos sueltos (Auditoría GEO IA, Pack Ads y Calculadora ITP Pro). Scale y Elite están RETIRADOS (no mencionar como productos; /scale/ y /elite/ redirigen a /precios/). Orion IA Calls también retirado (/orion-calls/ redirige a /orion-agent/).
- Plazos: "5-7 días laborables" para Spark, Orion IA Agent, Core Spark Web, Core Orion y Core RAG.
- Precios actuales (tarifa 2026 — la fuente de verdad es `/precios/`; verificar ahí antes de citar precios):
  - Mini Core: 599€ setup + 99€/mes · Sin permanencia · Landing profesional + agente IA para autónomos sin presencia online
  - Spark: 499€ setup + 99€/mes · Sin permanencia · Agente conversacional por texto en web existente
  - Orion IA Agent: 799€ setup + 99€/mes · Sin permanencia · Agente de voz 24/7 en español natural, embebido en tu web actual
  - Core Spark Web: 899€ setup + 99€/mes · Sin permanencia · Web nueva + agente de texto + SEO/GEO (para quien NO tiene web)
  - Core Orion: 1.499€ setup + 99€/mes · Sin permanencia · Web nueva + agente de voz + SEO/GEO desde el día 1 (para quien NO tiene web)
  - WhiteMoon 360: 1.899€ setup + 199€/mes · Sin permanencia · Web + agente IA de chat 24/7 + CRM de gestión (reparto automático de trabajo, avisos al móvil, agenda, historial)
  - Core RAG: 2.499€ setup + 199€/mes · Sin permanencia · Agente IA entrenado con documentos propios del cliente — SIN web
  - Auditoría GEO IA: 899€ pago único · informe en 48h
  - Pack Ads: 599€/mes SIN setup · Sin permanencia · Gestión de Meta Ads (Facebook + Instagram) con creatividades incluidas. La inversión publicitaria en plataforma va APARTE, no incluida en la cuota
  - Calculadora ITP Pro: 599€ setup + 99€/mes · SaaS para gestorías y administradores de fincas
- Precios OBSOLETOS que el SEO Guardian bloquea en páginas de packs (check 8, `BAD_PRICES` en `seo_guardian.py`): 4.500€, 8.500€, 2.899€, 1.800€, 3.200€, 999€. No reintroducirlos.
- Permanencia: ningún pack tiene permanencia. 30 días de aviso para cancelar.
- Core RAG: SIN diseño web incluido — solo agente IA RAG
- Laura IA NUNCA recomienda Core Spark Web ni Core Orion si el cliente ya tiene web (→ Spark u Orion IA Agent)
- Laura IA NUNCA recomienda RAG sin documentos propios del cliente
- Sin testimonios ficticios
- Sin cifras de rendimiento inventadas: nada de "+X% de conversión", "recuperan la inversión en X días" ni "media de nuestros clientes" si no hay una fuente que se pueda enseñar. Si el dato no existe, el número lo pone el usuario en un input y se etiqueta como supuesto suyo (así funciona la calculadora de `/precio-agente-ia/`).
- Sin menciones a Orbit o packs obsoletos
- Fundada en 2025
- Descripción del Pack Core Spark Web: "Web profesional + chatbot IA por texto + SEO y GEO/AEO. Tu negocio online, automatizado y visible en Google, ChatGPT y Grok desde el día 1." (incluye web con diseño personalizado, dominio el primer año, chatbot IA 24/7 por texto, sistema de reservas, SEO técnico completo, GEO/AEO, captura de leads → WhatsApp, responsive; 899€ setup + 99€/mes, operativo en 5-7 días, sin permanencia)
- Descripción del Pack Core Orion: igual que Core Spark Web pero con agente de voz 24/7 en español natural en lugar de chatbot por texto (1.499€ setup + 99€/mes, operativo en 5-7 días, sin permanencia)

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
