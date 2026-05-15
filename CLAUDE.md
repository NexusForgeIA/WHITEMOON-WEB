# WhiteMoon Web — Contexto para Claude Code

## Stack
- HTML estático + CSS + JS vanilla
- GitHub Pages
- Supabase para leads_web
- Sin frameworks, sin npm

## Reglas
- Siempre pushear a rama designada, nunca directo a main
- Plazos: siempre "5-7 días laborables" (nunca 48h)
- Precios actuales: Spark 499€+199€/mes · Core 1800€+199€/mes · Scale 4500€+449€/mes · Elite 8500€+799€/mes · Gestoría IA 599€+299€/mes · Auditoría 899€
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
