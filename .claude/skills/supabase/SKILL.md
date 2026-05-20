---
name: supabase
description: WhiteMoon Supabase config — project ID, tables (leads_web, BOE vehiculos/motos), RLS policies, and edge function rules. Use when working with WhiteMoon Supabase data or functions.
---

# SKILL: Supabase WhiteMoon

## Proyecto
ID: mlaqtniujnvfxcvcourm
Plan: Pro

## Tablas
- leads_web: leads de whitemoon.es
- vehiculos_boe_2026: 76.272 vehículos BOE
- motos_boe_2026: motos, quads, ciclomotores

## Políticas RLS
- Allow anonymous inserts/deletes/updates en leads_web

## Reglas
- verify_jwt: false en funciones públicas
- ANTHROPIC_API_KEY ya configurado como secret
