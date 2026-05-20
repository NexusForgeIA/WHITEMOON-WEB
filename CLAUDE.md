# WhiteMoon Web — Contexto para Claude Code

## Stack
- HTML estático + CSS + JS vanilla
- GitHub Pages
- Supabase para leads_web
- Sin frameworks, sin npm

## Reglas
- Siempre pushear a rama designada, nunca directo a main
- Plazos: "5-7 días laborables" para Spark, Core, Core RAG y Gestoría IA. Scale y Elite: "Plazo según proyecto" (nunca 48h)
- Precios actuales: Spark 499€+199€/mes · Core 1800€+199€/mes · Core RAG 3.200€+349€/mes · Scale 4500€+449€/mes · Elite 8500€+desde 599€/mes — según proyecto · Gestoría IA 599€+299€/mes · Auditoría 899€
- Permanencia — Scale y Elite: 12 meses mínimo. Resto sin permanencia, 30 días aviso.
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
