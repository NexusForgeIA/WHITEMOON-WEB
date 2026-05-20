---
name: notebooklm-slides
description: Generador de prompts de diseño para presentaciones en NotebookLM y Kael.im. Úsalo cuando el usuario pida crear slides, decks o presentaciones con estilos visuales específicos. Triggers: "hazme una presentación de X", "crea un deck para el cliente", "genera slides en estilo Y", "prompt para NotebookLM", "presentación para pitch/propuesta/demo", "slides para Bambu Sushi", "deck de ventas WhiteMoon". Incluye 10 estilos: Modern Newspaper, Sharp-edged Minimalism, Black×Orange Agency, Yellow×Black Editorial, Neo-Retro Dev Deck, Anti-Gravity Artifact, Studio Mockup Premium, Digital Neo Pop, Sculpture Vaporwave, Tech Art Neon. Siempre entrega el prompt listo en español para pegar directamente en NotebookLM o Kael.im, con branding WhiteMoon incluido si aplica.
allowed-tools: WebFetch, WebSearch
hidden: true
---

# notebooklm-slides

Genera prompts de diseño visual para NotebookLM y Kael.im, listos para pegar.
Convierte cualquier contenido en un deck con estilo editorial profesional.

Herramienta recomendada: https://kael.im (alternativa a NotebookLM, 100 páginas gratis/día).
Fuente de estilos: https://github.com/serenakeyitan/awesome-notebookLM-prompts

## Flujo de uso

1. Identifica el objetivo — venta, demo, pitch, formación, caso de éxito
2. Selecciona el estilo del catálogo (ver sección Estilos)
3. Adapta el idioma — sustituye cualquier "the language what users requested" por español
4. Personaliza la marca — si es proyecto WhiteMoon, añade el snippet de branding al final
5. Entrega el prompt completo listo para pegar, sin pasos adicionales

## Estilos disponibles

### Editorial / Business

**Modern Newspaper** — pitches de agencia, autoridad, newsletters premium
Paleta: #FFFFFF / #111111 / #FFCC00 / #FF3333
Filosofía Swiss Style / Bauhaus. Layout asimétrico.
Titulares ULTRA-MASIVOS (30-50% del slide). Ratio tipográfico 10:1.
1 slide = 1 mensaje. Sin símbolos Markdown en texto de slides.

**Sharp-edged Minimalism** — propuestas Scale/Elite, portfolios, clientes premium
Paleta: #E9E9E9 / #000000. Tono arquitectónico, minimalismo afilado.
Número de sección arriba izquierda ("01. INTRODUCCIÓN"). Grid estricto.
Whitespace intencional = sensación de lujo.

**Black × Orange Agency** — decks comerciales WhiteMoon, onboarding clientes
Fondo blanco, texto negro, acento naranja sangre.
Diseño de agencia creativa. Fotos dinámicas + tipografía inglesa como elemento gráfico.

**Yellow × Black Editorial** — RRSS, autoridad, materiales bold
Fondo amarillo, texto negro, serif moderno dinámico.
Fotografía de moda única. Toques handwriting/stickers. Layout revista bold.

### Tech / Dev

**Neo-Retro Dev Deck** — demos técnicas, producto tech, onboarding developers
Canvas cuadrícula crema (engineering notebook). Bloques de color con bordes negros gruesos.
Hot Pink / Bright Yellow / Cyan / Black. Iconos pixel-art 8-bit.
Tono: short, declarative, opinionated. Sin marketing fluff.

**Anti-Gravity / Living Artifact** — pitch inversores, demos IA, corporativo premium
"Esta presentación no es un deck. Es un artefacto vivo."
Fondo blanco + acentos gradiente azul→cyan→violeta solo en bordes (muy baja opacidad).
1 idea/slide. Thin-line icons. Tono preciso, levemente filosófico. Sin hype.

### Premium

**Studio / Mockup Premium** — SaaS, demos producto digital, inversores tech
Mockups 3D Apple (Studio Display, MacBook Pro, iPad, iPhone).
Acento: #8D59E9 (Electric Purple) + #EBE021 (Acid Yellow).
Screens = 70-80% del slide. Studio lighting con sombras suaves.

### Pop / Arte

**Digital / Neo / Pop** — startups, retail, moda, tech consumer
Formas orgánicas amoeba en bordes. Pink/cyan/purple neón. Negro como ancla.
Dots + highlight mano alzada + iconos SNS. Gothic bold, números grandes.

**Sculpture × Vaporwave** — viral RRSS, creatividades de marca audaces
Fondos saturados cambiantes por slide. Estatuas mármol clásico + gadgets modernos.
Ultra-bold sans serif. No reutilizar misma estatua. Fuerte contraste fondo×accesorios.

**Tech / Art / Neon (Constructivismo)** — agencias creativas, portfolios, innovación
Fondo beige #E0E0D0 + texto carbón #333333 + acento amarillo neón #DFFF00.
Retratos monocromos recortados + geometría neón. Líneas ultra-finas 0.5pt.
Capas: grid → geometría neón → foto monocroma → texto.

## Snippet branding WhiteMoon

Añadir al final de cualquier prompt para proyectos de la agencia:

[BRANDING WHITEMOON]
Empresa: WhiteMoon Agencia IA — Majadahonda, Madrid
Web: whitemoon.es | Email: comercial@whitemoon.es
Paleta corporativa: morado profundo + blanco + gris oscuro
Tono: premium, tecnológico, directo, sin fluff
CTA final del deck: whitemoon.es | comercial@whitemoon.es | WhatsApp 643 199 580

## Casos de uso frecuentes en WhiteMoon

- Deck de ventas para prospecto → Sharp-edged Minimalism o Anti-Gravity
- Propuesta cliente Spark/Core → Black × Orange Agency
- Demo gestorías → Sharp-edged Minimalism
- Pitch inversor / Scale/Elite → Anti-Gravity / Living Artifact
- Contenido RRSS WhiteMoon → Yellow × Black o Digital Neo Pop
- Demo Bambu Sushi → Black × Orange o Magazine Style
- Onboarding técnico → Neo-Retro Dev Deck
