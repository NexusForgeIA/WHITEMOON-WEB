---
name: chatbot
description: WhiteMoon chatbot/agente IA rules — Supabase Edge Functions, claude-haiku model config, system-prompt constraints, and WhatsApp lead delivery. Use when building or editing the WhiteMoon chatbot/agente IA.
---

# SKILL: Chatbot/Agente IA WhiteMoon

## Stack obligatorio
- Edge Function Supabase
- Modelo: claude-haiku-4-5-20251001
- max_tokens: 450
- messages.slice(-12)

## Reglas system prompt
- Máximo 3 frases por respuesta
- Una pregunta a la vez
- Al tener nombre + teléfono: cerrar y enviar lead
- NUNCA dar precios de honorarios internos
- NUNCA inventar datos (BOE, fiscales, legales)

## Envío lead WhatsApp
WA_NUMBER = 34643199580
Siempre incluir: nombre, teléfono, sector, origen "Agente IA"

## Edge Functions activas
- gestoria-itp v6: cálculo ITP con BOE real
- gestoria-chat v15: Laura agente IA gestoría
