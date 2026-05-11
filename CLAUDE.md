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

## Captación de leads (chatbot · Supabase `leads_web`) — REGLA FIJA
Aplica a todos los flujos, presentes y futuros:
- Todo `startCapture()` debe pasar el `sector` detectado por el bot.
- Todo `finishCapture()` debe llamar a `saveLead()`.
- `saveLead()` siempre incluye `sector` + `descripcion` además de `nombre` y `telefono`.
- Payload completo enviado a `leads_web`: `nombre`, `telefono`, `sector`, `interes`, `descripcion`, `origen` (`"whitemoon.es"`), `fecha` (ISO).
- Si el envío a Supabase falla → `console.warn`, NUNCA se interrumpe el flujo del usuario.

## Skills activas
- /spec antes de cualquier nueva funcionalidad
- /review antes de mergear
- /build para implementación incremental
