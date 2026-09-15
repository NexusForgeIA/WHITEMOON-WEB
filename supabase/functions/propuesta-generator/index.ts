import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// propuesta-generator — genera una propuesta comercial WhiteMoon en HTML.
// Claude (haiku) redacta solo las secciones narrativas (JSON); la funcion
// ensambla el HTML final con datos deterministas (producto, plazo, condiciones, CTA).
// Modelo de 2 productos con propuesta a medida: la propuesta no lleva precios,
// ni cifras de rendimiento, ni productos retirados. Si un texto de Claude
// incumple esas reglas se descarta y se usa un texto fijo.

const WA = '643199580';
const WEB = 'whitemoon.es';

// Productos vigentes. Sin precios: la parte economica se cierra en la llamada.
const PRODUCTOS: Record<string, { label: string; cap: string; features: string[] }> = {
  spark: {
    label: 'Spark',
    cap: 'agente IA en la web que ya tienes · atiende, agenda y capta leads 24/7',
    features: ['Agente IA 24/7 en tu web actual', 'Entrenado con tus servicios y tu tono', 'Agenda citas segun tu disponibilidad', 'Captura de nombre, telefono y motivo', 'Aviso inmediato de cada lead', 'RAG opcional con tus documentos'],
  },
  'core-spark-web': {
    label: 'Core Spark Web',
    cap: 'web nueva con el agente IA dentro y un CRM para gestionar cada lead · SEO, GEO y AEO',
    features: ['Web nueva con tu dominio, SSL y mantenimiento', 'Agente IA 24/7 dentro desde el primer dia', 'CRM: pipeline, reparto al equipo, agenda e historial', 'SEO, GEO y AEO de serie', 'Aviso inmediato de cada lead', 'RAG opcional con tus documentos'],
  },
};

// Plazo y condiciones. Ningun producto tiene permanencia.
const TERMS = { plazo: '7 dias laborables', permanencia: 'Sin permanencia' };

// Lo que una propuesta nunca puede decir: precios, porcentajes o cifras de
// rendimiento, productos retirados, voz y preaviso de cancelacion.
const PROHIBIDO = /€|\beur(?:os)?\b|%|[+\-−]\s?\d+\s?(?:h\b|x\b|veces)|\b\d+\s?(?:x|veces)\b|\bOrion\b|Core Orion|WhiteMoon 360|Core RAG|Mini Core|\bvoz\b|30 d[ií]as/i;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }) as Record<string, string>)[c]);

const limpio = (v: unknown) => {
  const s = String(v ?? '');
  return s && !PROHIBIDO.test(s) ? s : '';
};

const incumple = (ai: Record<string, unknown>) =>
  [ai.resumen_ejecutivo, ai.problema, ai.solucion, ai.caso_exito, ...(Array.isArray(ai.features) ? ai.features : [])]
    .some((v) => PROHIBIDO.test(String(v ?? '')));

async function redactar(apiKey: string, system: string, user: string): Promise<{ ai?: Record<string, unknown>; error?: Response }> {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    return {
      error: new Response(JSON.stringify({ error: 'Claude API error', details: err }), {
        status: resp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }),
    };
  }
  const data = await resp.json();
  let raw = (data.content?.[0]?.text || '{}').trim();
  raw = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  let ai: Record<string, unknown> = {};
  try {
    ai = JSON.parse(raw);
  } catch {
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    if (s >= 0 && e > s) { try { ai = JSON.parse(raw.slice(s, e + 1)); } catch { /* noop */ } }
  }
  return { ai };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const body = await req.json();
    const {
      nombre_cliente = '', empresa = '', sector = '', pack = 'core-spark-web',
      url_web = '', dolor_principal = '', notas = '',
    } = body ?? {};

    const packKey = String(pack).toLowerCase().trim();
    const P = PRODUCTOS[packKey];
    if (!P) return json({ error: 'pack no valido', permitidos: Object.keys(PRODUCTOS) }, 400);
    const T = TERMS;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY no configurada' }, 500);

    const SYSTEM = [
      'Eres un copywriter comercial senior de WhiteMoon Agencia IA (agentes IA para la web de pymes en Espana).',
      'Escribes propuestas comerciales cercanas, honestas y profesionales, en espanol de Espana.',
      'WhiteMoon tiene solo dos productos: Spark (agente IA en la web que el negocio ya tiene) y Core Spark Web (web nueva con el agente IA dentro y un CRM). No existe ningun otro producto.',
      'Devuelves EXCLUSIVAMENTE un objeto JSON valido (sin markdown, sin texto fuera del JSON) con estas claves:',
      '- resumen_ejecutivo: 2-3 parrafos en HTML (<p>...</p>) dirigidos al cliente, conectando su sector con el valor de un agente IA.',
      '- problema: 1-2 parrafos en HTML sobre el problema concreto de su sector, partiendo del dolor indicado.',
      '- solucion: 1-2 parrafos en HTML que presentan el producto recomendado aplicado a su sector.',
      '- features: array de 6 features concretas del sector y del producto (frases cortas).',
      '- caso_exito: 1 parrafo en HTML. Si el sector es restaurante, usa el cliente real Bambu Sushi (Cordoba: web + SEO + chatbot de reservas y pedidos). Para CUALQUIER OTRO sector, explica de forma cualitativa como ayuda un agente IA a un negocio de ese sector, SIN nombres de clientes, SIN testimonios y SIN cifras.',
      'Reglas estrictas: no escribas precios, importes ni el simbolo del euro; no escribas porcentajes, multiplicadores ni cifras de resultados o de ahorro (el retorno se calcula en la llamada con los numeros reales del cliente); no menciones canales distintos del texto en la web, llamadas telefonicas ni ningun otro producto; no menciones plazos de cancelacion; HTML simple (solo <p>, <strong>, <em>); todas las claves con comillas dobles JSON estandar.',
    ].join('\n');

    const USER = [
      'Datos del cliente para la propuesta:',
      '- Cliente: ' + (nombre_cliente || '(sin nombre)'),
      '- Empresa: ' + (empresa || '(sin empresa)'),
      '- Sector: ' + (sector || '(generico)'),
      '- Producto recomendado: ' + P.label + ' (' + P.cap + ')',
      '- Web actual: ' + (url_web || '(no indica)'),
      '- Dolor principal: ' + (dolor_principal || '(no indica)'),
      '- Notas de la llamada: ' + (notas || '(ninguna)'),
      'Genera el JSON de la propuesta.',
    ].join('\n');

    let r = await redactar(apiKey, SYSTEM, USER);
    if (r.error) return r.error;
    if (incumple(r.ai!)) {
      const r2 = await redactar(apiKey, SYSTEM, USER + '\nIMPORTANTE: tu respuesta anterior incluia precios, porcentajes, cifras de resultados o productos no permitidos. Reescribela sin ninguno.');
      if (!r2.error) r = r2;
    }
    const ai = r.ai ?? {};

    const resumen = limpio(ai.resumen_ejecutivo) ||
      ('<p>Propuesta para ' + esc(empresa || nombre_cliente || 'tu negocio') + ': un agente IA que atiende a tus clientes 24/7, responde con tu informacion y te pasa cada lead al momento.</p>');
    const problema = limpio(ai.problema);
    const solucion = limpio(ai.solucion) || ('<p>' + esc(P.label) + ': ' + esc(P.cap) + '.</p>');
    const aiFeatures = Array.isArray(ai.features)
      ? (ai.features as unknown[]).map((f) => String(f)).filter((f) => f && !PROHIBIDO.test(f))
      : [];
    const features = aiFeatures.length >= 4 ? aiFeatures.slice(0, 6) : P.features;
    const caso = limpio(ai.caso_exito);

    const html = assemble({ nombre_cliente, empresa, sector, P, T, resumen, problema, solucion, features, caso });
    return json({ html });
  } catch (err) {
    return json({ error: 'Error interno', details: String(err) }, 500);
  }
});

function assemble(d: any): string {
  const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  const cliente = esc(d.nombre_cliente || '');
  const empresa = esc(d.empresa || '');
  const sector = esc(d.sector || '');
  const P = d.P, T = d.T;
  const featuresHtml = d.features.map((f: string) => '<li>' + esc(f) + '</li>').join('');

  return [
    "<!DOCTYPE html>",
    "<html lang='es'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1'>",
    "<title>Propuesta WhiteMoon · " + (empresa || cliente) + "</title>",
    "<link href='https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap' rel='stylesheet'>",
    "<style>",
    ":root{--bg:#08080d;--purple:#7c4dff;--accent:#00d4aa;--light:#f0f0f5;--muted:#8a8a9e;--line:#23232f;--panel:#11111a}",
    "*{box-sizing:border-box;margin:0;padding:0}",
    "body{font-family:'Sora',system-ui,sans-serif;background:#fff;color:#14141c;line-height:1.6;font-size:15px}",
    ".doc{max-width:820px;margin:0 auto;background:#fff}",
    ".cover{background:var(--bg);color:var(--light);padding:54px 48px;border-bottom:4px solid var(--accent)}",
    ".logo{font-size:1.9rem;font-weight:800;letter-spacing:-.02em;background:linear-gradient(135deg,#fff,var(--purple) 60%,var(--accent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}",
    ".cover .tag{display:inline-block;margin-top:22px;font-size:.72rem;letter-spacing:.16em;text-transform:uppercase;color:var(--accent);font-weight:600}",
    ".cover h1{font-size:2rem;font-weight:700;margin:8px 0 18px;letter-spacing:-.02em}",
    ".cover .meta{color:var(--muted);font-size:.92rem}",
    ".cover .meta b{color:var(--light);font-weight:600}",
    "section{padding:30px 48px;border-bottom:1px solid #ececf2}",
    "h2{font-size:1.15rem;font-weight:700;color:#14141c;margin-bottom:12px;display:flex;align-items:center;gap:10px}",
    "h2::before{content:'';width:20px;height:3px;border-radius:2px;background:linear-gradient(90deg,var(--purple),var(--accent))}",
    "p{margin-bottom:10px}",
    ".feat{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:8px 18px;margin-top:6px}",
    ".feat li{position:relative;padding-left:24px;font-size:.92rem}",
    ".feat li::before{content:'✓';position:absolute;left:0;color:var(--accent);font-weight:800}",
    ".roi{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:6px}",
    ".roi .c{background:var(--panel);color:var(--light);border-radius:12px;padding:18px;text-align:center}",
    ".roi .c .n{font-size:1.2rem;font-weight:800;color:var(--accent);letter-spacing:-.02em}",
    ".roi .c .l{font-size:.74rem;color:var(--muted);margin-top:4px}",
    ".precio{display:flex;gap:18px;flex-wrap:wrap;margin-top:6px}",
    ".precio .box{flex:1;min-width:200px;border:2px solid var(--purple);border-radius:14px;padding:20px;background:linear-gradient(135deg,rgba(124,77,255,.06),rgba(0,212,170,.06))}",
    ".precio .box .pk{font-size:.8rem;color:var(--purple);font-weight:700;text-transform:uppercase;letter-spacing:.08em}",
    ".precio .box .big{font-size:1.7rem;font-weight:800;margin:6px 0;letter-spacing:-.02em}",
    ".precio .box .sub{color:#555;font-size:.85rem}",
    ".precio .box .cap{margin-top:10px;font-size:.84rem;color:#333}",
    ".pasos{display:flex;gap:12px;flex-wrap:wrap;margin-top:6px}",
    ".pasos .p{flex:1;min-width:150px;background:#f6f6fb;border-radius:10px;padding:14px;font-size:.88rem}",
    ".pasos .p b{display:block;color:var(--purple);margin-bottom:3px}",
    ".cta{background:var(--bg);color:var(--light);padding:34px 48px;text-align:center}",
    ".cta h3{font-size:1.25rem;font-weight:700;margin-bottom:14px}",
    ".cta a{display:inline-block;margin:6px;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;font-size:.92rem}",
    ".cta .wa{background:#25D366;color:#fff}",
    ".cta .web{background:linear-gradient(135deg,var(--purple),var(--accent));color:#fff}",
    ".foot{padding:18px 48px;text-align:center;color:var(--muted);font-size:.74rem;background:var(--bg)}",
    "@media print{body{font-size:12px}.cover,.cta,.foot{-webkit-print-color-adjust:exact;print-color-adjust:exact}section{padding:18px 36px}}",
    "@media(max-width:560px){.cover,section,.cta,.foot{padding-left:24px;padding-right:24px}.feat,.roi{grid-template-columns:1fr}}",
    "</style></head>",
    "<body><div class='doc'>",
    "<div class='cover'>",
    "<div class='logo'>WhiteMoon</div>",
    "<div class='tag'>Propuesta comercial</div>",
    "<h1>" + (empresa || cliente || 'Tu negocio, automatizado con IA') + "</h1>",
    "<div class='meta'>",
    (cliente ? "<div>A la atencion de <b>" + cliente + "</b></div>" : ''),
    (empresa ? "<div>Empresa: <b>" + empresa + "</b></div>" : ''),
    (sector ? "<div>Sector: <b>" + sector + "</b></div>" : ''),
    "<div>Fecha: <b>" + fecha + "</b></div>",
    "</div></div>",
    "<section><h2>Resumen ejecutivo</h2>" + d.resumen + "</section>",
    (d.problema ? "<section><h2>El reto de tu sector</h2>" + d.problema + "</section>" : ''),
    "<section><h2>La solucion: " + esc(P.label) + "</h2>" + d.solucion + "<ul class='feat'>" + featuresHtml + "</ul></section>",
    "<section><h2>Retorno de la inversion</h2><p>El retorno depende de tus numeros: las consultas que hoy se pierden fuera de horario, tu ticket medio y las horas que tu equipo dedica a responder lo mismo. En la llamada lo calculamos con tus numeros reales, sin estimaciones genericas.</p><div class='roi'>",
    "<div class='c'><div class='n'>Consultas</div><div class='l'>que hoy se pierden fuera de horario</div></div>",
    "<div class='c'><div class='n'>Horas</div><div class='l'>de tu equipo respondiendo lo mismo</div></div>",
    "<div class='c'><div class='n'>Tus numeros</div><div class='l'>lo calculamos contigo en la llamada</div></div>",
    "</div></section>",
    "<section><h2>Inversion</h2><div class='precio'>",
    "<div class='box'><div class='pk'>" + esc(P.label) + "</div><div class='big'>Propuesta a medida</div><div class='sub'>La cerramos en la llamada, sin compromiso.</div><div class='cap'>" + esc(P.cap) + "</div></div>",
    "</div></section>",
    (d.caso ? "<section><h2>Casos de exito</h2>" + d.caso + "</section>" : ''),
    "<section><h2>Proximos pasos</h2><div class='pasos'>",
    "<div class='p'><b>1 · Activacion</b>" + esc(T.plazo) + "</div>",
    "<div class='p'><b>2 · Condiciones</b>" + esc(T.permanencia) + "</div>",
    "<div class='p'><b>3 · En marcha</b>Tu agente IA captando clientes 24/7</div>",
    "</div></section>",
    "<div class='cta'><h3>Lo activamos?</h3>",
    "<a class='wa' href='https://wa.me/34" + WA + "' target='_blank' rel='noopener'>WhatsApp " + WA + "</a>",
    "<a class='web' href='https://" + WEB + "' target='_blank' rel='noopener'>" + WEB + "</a></div>",
    "<div class='foot'>WhiteMoon Agencia IA · Majadahonda, Madrid · Propuesta sin compromiso</div>",
    "</div></body></html>",
  ].join('\n');
}
