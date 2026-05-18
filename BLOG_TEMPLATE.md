# Plantilla Blog WhiteMoon — Estructura obligatoria

## Stack técnico
- CSS externo: /assets/blog.css
- Fuente: Sora (Google Fonts)
- Variables dark theme inline obligatorias en <head>
- Template de referencia: blog/agentes-ia-pymes-2026/index.html

## Estructura HTML obligatoria

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <!-- Meta tags SEO -->
  <title>[Título ≤65c] · WhiteMoon</title>
  <meta name="description" content="[Desc ≤160c]">
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
  <meta name="author" content="WhiteMoon Agencia IA">
  <link rel="canonical" href="https://whitemoon.es/blog/[slug]/">
  
  <!-- OG + Twitter -->
  <meta property="og:title" content="[Título ≤65c]">
  <meta property="og:description" content="[Desc ≤160c]">
  <meta property="og:url" content="https://whitemoon.es/blog/[slug]/">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="es_ES">
  <meta property="og:image" content="https://whitemoon.es/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="[Título]">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:image" content="https://whitemoon.es/og-image.jpg">
  
  <!-- Article meta -->
  <meta property="article:author" content="WhiteMoon Agencia IA">
  <meta property="article:published_time" content="[YYYY-MM-DD]T10:00:00+01:00">
  <meta property="article:modified_time" content="[YYYY-MM-DD]T10:00:00+01:00">
  <meta property="article:section" content="[Sección]">
  
  <!-- Schema BlogPosting -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": "[Título ≤65c]",
    "description": "[Desc ≤160c]",
    "articleSection": "[Sección]",
    "author": {
      "@type": "Person",
      "name": "Cristobal Martinez",
      "jobTitle": "Fundador & CEO",
      "worksFor": {"@type": "Organization", "name": "WhiteMoon Agencia IA", "url": "https://whitemoon.es"}
    },
    "publisher": {"@type": "Organization", "name": "WhiteMoon Agencia IA", "url": "https://whitemoon.es"},
    "datePublished": "[YYYY-MM-DD]",
    "dateModified": "[YYYY-MM-DD]",
    "mainEntityOfPage": {"@type": "WebPage", "@id": "https://whitemoon.es/blog/[slug]/"},
    "url": "https://whitemoon.es/blog/[slug]/",
    "inLanguage": "es-ES"
  }
  </script>
  
  <!-- Fuente + Dark theme WhiteMoon OBLIGATORIO -->
  <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/blog.css">
  <style>
  :root{
    --p:#7c4dff;--p2:#9d70ff;--p-dark:#5c35cc;
    --g:#00d4aa;
    --bg:#08080d;--bg2:#0e0e16;--bg3:#13131e;
    --text:#f0f0f5;--muted:#8888a0;
    --border:rgba(124,77,255,0.15);
  }
  body{background:var(--bg);color:var(--text);font-family:'Sora',sans-serif;}
  a{color:var(--p2);}
  </style>
  <meta name="theme-color" content="#7c4dff">
</head>
<body>

<!-- NAV -->
<nav>...</nav>

<!-- HERO -->
<main>
  <div class="wrap">
    <div class="breadcrumb">
      <a href="/">WhiteMoon</a> › <a href="/blog/">Blog</a> › [Título corto]
    </div>
    <article>
      <section class="post-hero">
        <div class="post-badge">[Categoría]</div>
        <h1>[Título del artículo]</h1>
        <div class="post-meta">
          <span>[Fecha]</span>
          <span class="post-meta-dot"></span>
          <span>[X min lectura]</span>
          <span class="post-meta-dot"></span>
          <span>WhiteMoon Agencia IA</span>
        </div>
      </section>

      <!-- NOTA AGENTE IA OBLIGATORIA si el artículo menciona "chatbot" -->
      <div style="background:rgba(124,77,255,0.08);border:1px solid rgba(124,77,255,0.2);border-left:3px solid #7c4dff;border-radius:12px;padding:16px 20px;margin-bottom:24px;font-size:14px;line-height:1.6;color:#b39dff;">
        <strong style="color:#9d70ff;">📌 Nota de WhiteMoon:</strong> Lo que muchos llaman "chatbot" hoy en día es en realidad un <strong>Agente IA</strong> — una tecnología mucho más avanzada que responde, cualifica y actúa de forma autónoma. En este artículo usamos ambos términos para facilitar la búsqueda, pero en WhiteMoon trabajamos exclusivamente con <strong>Agentes IA</strong>. <a href="/blog/agente-ia-vs-chatbot-diferencias/" style="color:#7c4dff;">¿Cuál es la diferencia exacta? →</a>
      </div>

      <!-- CONTENIDO -->
      <div class="art-body">
        <div class="art-intro">[Párrafo introductorio destacado]</div>
        <h2>[Sección 1]</h2>
        <p>...</p>
        <!-- CTA INLINE a mitad del artículo -->
        <div class="cta-inline">
          <p>[Texto CTA]</p>
          <a href="https://wa.me/34643199580" class="btn-prim">Contactar →</a>
        </div>
        <h2>[Sección 2]</h2>
        <p>...</p>
      </div>

      <!-- ARTÍCULOS RELACIONADOS -->
      <section class="related-posts">
        <h3>Artículos relacionados</h3>
        <!-- 2-3 enlaces a otros posts del blog -->
      </section>
    </article>
  </div>
</main>

<footer>...</footer>
</body>
</html>
```

## Checklist antes de publicar
- [ ] Title ≤65c con · WhiteMoon al final
- [ ] Meta description ≤160c
- [ ] OG tags completos (og:image, og:title, og:description)
- [ ] twitter:card summary_large_image
- [ ] Schema BlogPosting válido (headline = title, description = meta desc)
- [ ] datePublished y dateModified correctos
- [ ] Dark theme variables en <style> inline
- [ ] Fuente Sora cargada
- [ ] Nota Agente IA si el artículo menciona chatbot
- [ ] Breadcrumb visible
- [ ] CTA inline a mitad del artículo
- [ ] Sección related-posts con 2-3 enlaces
- [ ] Añadir URL al sitemap.xml
- [ ] Añadir BlogPosting al Schema Blog en blog/index.html
- [ ] Añadir tarjeta visible en blog/index.html
