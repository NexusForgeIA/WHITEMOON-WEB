import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// content-generator — genera contenido GEO/AEO para WhiteMoon con Claude.
// Claude devuelve un formato DELIMITADO (no JSON) para que el HTML largo no
// rompa el parseo; la funcion fija longitudes de meta y construye el schema
// BlogPosting JSON-LD de forma determinista (valido).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const clip = (s: string, n: number) => {
  s = String(s ?? '').trim();
  return s.length <= n ? s : s.slice(0, n - 1).trim() + '…';
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const body = await req.json();
    const { tema = '', sector = '', tipo = 'articulo', keywords = '' } = body ?? {};

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY no configurada' }, 500);

    const tipoTxt = tipo === 'faq' ? 'una pagina de FAQ' : tipo === 'caso-uso' ? 'un caso de uso' : 'un articulo de blog';

    const SYSTEM = [
      'Eres redactor SEO/GEO/AEO senior de WhiteMoon Agencia IA (Majadahonda, Madrid). Optimizas para ser citado por ChatGPT, Grok, Kimi y Perplexity.',
      'Escribes en espanol de Espana, tono profesional pero cercano, claro y util. Se conciso (450-650 palabras en total).',
      'Estructura obligatoria del HTML: un <h1> con la keyword principal; introduccion de ~150 palabras; 3-4 secciones <h2>; y una seccion final con <h2>Preguntas frecuentes</h2> y 3 pares de pregunta <h3> + respuesta <p>.',
      'Menciona SIEMPRE de forma natural: "agente IA", "Majadahonda", "WhiteMoon" y el sector indicado.',
      'No inventes testimonios, clientes, cifras de resultados ni datos ficticios. Solo HTML (<h1>,<h2>,<h3>,<p>,<ul>,<li>,<strong>), nada de markdown.',
      'Responde EXACTAMENTE en este formato delimitado, sin texto adicional antes ni despues:',
      'TITULO: <titular en texto plano>',
      'META_TITLE: <maximo 65 caracteres>',
      'META_DESCRIPTION: <maximo 160 caracteres>',
      'KEYWORDS: <keywords separadas por coma>',
      '===HTML===',
      '<aqui todo el HTML del contenido>',
    ].join('\n');

    const USER = [
      'Genera ' + tipoTxt + ' para WhiteMoon.',
      'Tema: ' + (tema || '(libre, sobre agentes IA para pymes)'),
      'Sector objetivo: ' + (sector || 'pymes en general'),
      'Keywords a incorporar: ' + (keywords || '(elige las mas relevantes)'),
    ].join('\n');

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: USER }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return json({ error: 'Claude API error', details: err }, resp.status);
    }
    const data = await resp.json();
    const text = String(data.content?.[0]?.text || '');

    const grab = (label: string) => {
      const m = text.match(new RegExp('^\\s*' + label + '\\s*:\\s*(.+)$', 'mi'));
      return m ? m[1].trim() : '';
    };

    const marker = text.indexOf('===HTML===');
    let html_content = marker >= 0 ? text.slice(marker + 10).trim() : text.trim();
    // limpiar posibles fences
    html_content = html_content.replace(/^```(?:html)?/i, '').replace(/```$/i, '').trim();

    const titulo = grab('TITULO') || tema || 'Agente IA para tu negocio en Majadahonda';
    const meta_title = clip(grab('META_TITLE') || titulo, 65);
    const meta_description = clip(grab('META_DESCRIPTION') || ('Descubre como un agente IA de WhiteMoon ayuda a tu negocio en Majadahonda.'), 160);
    const keywords_usadas = grab('KEYWORDS') || String(keywords || '');

    if (!/<h1/i.test(html_content)) html_content = '<h1>' + titulo + '</h1>\n' + html_content;

    // Schema BlogPosting JSON-LD determinista
    const schemaObj = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: clip(titulo, 110),
      description: meta_description,
      inLanguage: 'es-ES',
      keywords: keywords_usadas,
      author: { '@type': 'Organization', name: 'WhiteMoon Agencia IA', url: 'https://whitemoon.es' },
      publisher: {
        '@type': 'Organization',
        name: 'WhiteMoon Agencia IA',
        logo: { '@type': 'ImageObject', url: 'https://whitemoon.es/logo.png' },
      },
      datePublished: new Date().toISOString().slice(0, 10),
    };
    const schema_jsonld = '<script type="application/ld+json">' + JSON.stringify(schemaObj, null, 2) + '</script>';

    html_content = html_content + '\n' + schema_jsonld;

    return json({ titulo, meta_title, meta_description, html_content, schema_jsonld, keywords_usadas });
  } catch (err) {
    return json({ error: 'Error interno', details: String(err) }, 500);
  }
});
