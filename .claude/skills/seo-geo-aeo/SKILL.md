---
name: seo-geo-aeo
description: WhiteMoon SEO/GEO/AEO audit checklist — meta tags, JSON-LD schema, sitemap, llms.txt/robots for LLM crawlers, and common errors. Use when auditing or editing WhiteMoon SEO.
---

# SKILL: SEO/GEO/AEO WhiteMoon

## Checklist auditoría

### Meta tags
- title ≤65c con · WhiteMoon al final
- meta description ≤160c
- og:image en JPG/PNG (nunca SVG — no funciona en redes)
- twitter:card summary_large_image
- hreflang es + x-default (solo home)

### Schema JSON-LD
- JSON válido (parseable)
- BlogPosting: headline = title, description = meta desc
- FAQPage: schema↔DOM sincronizados
- BreadcrumbList item 2 = "Agente IA" (no "Chatbot IA")
- 0 FAQPage duplicados por página

### Sitemap
- Todas las URLs con lastmod y priority
- 0 URLs huérfanas
- Actualizar en GSC tras cambios

### GEO/AEO
- llms.txt en raíz
- robots.txt con LLMs: https://whitemoon.es/llms.txt
- GPTBot, ClaudeBot, PerplexityBot permitidos

## Errores frecuentes
- SVG como og:image: Facebook/LinkedIn no lo renderizan
- FAQPage duplicado: Google lo ignora
- WhatsApp Business API: NO implementado, no mencionar
