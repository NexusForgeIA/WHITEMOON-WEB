import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

// propuesta-generator — genera una propuesta comercial WhiteMoon en HTML.
// Claude (haiku) redacta solo las secciones narrativas (JSON); la funcion
// ensambla el HTML final con datos deterministas (precios, ROI, plazos, CTA)
// para evitar alucinaciones en cifras y condiciones comerciales.

const WA = '643199580';
const WEB = 'whitemoon.es';

// Precios por pack (brief Modulo 2)
const PACKS: Record<string, { label: string; setup: number; mensual: number; cap: string }> = {
  spark: { label: 'Spark', setup: 499,  mensual: 199, cap: 'hasta 1 agente IA · flujos basicos' },
  core:  { label: 'Core',  setup: 1800, mensual: 199, cap: 'hasta 3 agentes IA · RAG con tus documentos' },
  scale: { label: 'Scale', setup: 4500, mensual: 449, cap: 'hasta 10 agentes IA · integraciones CRM' },
  elite: { label: 'Elite', setup: 8500, mensual: 799, cap: 'agentes ilimitados · infraestructura dedicada' },
};

// Plazo y permanencia por pack (regla CLAUDE.md: Scale/Elite plazo segun proyecto + 12 meses)
const TERMS: Record<string, { plazo: string; permanencia: string }> = {
  spark: { plazo: '5-7 dias laborables', permanencia: 'Sin permanencia · 30 dias de aviso' },
  core:  { plazo: '5-7 dias laborables', permanencia: 'Sin permanencia · 30 dias de aviso' },
  scale: { plazo: 'Plazo segun proyecto', permanencia: 'Permanencia minima 12 meses' },
  elite: { plazo: 'Plazo segun proyecto', permanencia: 'Permanencia minima 12 meses' },
};

// ROI por sector (brief) — horas/semana ahorradas + metrica destacada
const ROI: Record<string, { metric: string; horas: number }> = {
  dental:      { metric: '+40% mas citas agendadas',          horas: 15 },
  clinica:     { metric: '+40% mas citas agendadas',          horas: 15 },
  legal:       { metric: '+60% leads cualificados',           horas: 20 },
  abogados:    { metric: '+60% leads cualificados',           horas: 20 },
  restaurante: { metric: '+35% mas reservas · 24/7',          horas: 10 },
  gestoria:    { metric: '-25h/semana en consultas repetitivas', horas: 25 },
  inmobiliaria:{ metric: '+50% leads atendidos · 24/7',       horas: 18 },
  gimnasio:    { metric: '+30% conversion',                   horas: 10 },
  peluqueria:  { metric: '+30% conversion',                   horas: 10 },
  veterinaria: { metric: '+35% citas · atencion 24/7',        horas: 12 },
  formacion:   { metric: '+40% preinscripciones',             horas: 12 },
  taller:      { metric: '+30% presupuestos atendidos',       horas: 12 },
  podologia:   { metric: '+40% mas citas',                    horas: 12 },
  automovil:   { metric: '+30% leads atendidos',              horas: 14 },
};
const ROI_DEFAULT = { metric: '+30% leads atendidos · 24/7', horas: 12 };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => (({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }) as Record<string, string>)[c]);

// Formato es-ES con separador de miles (el runtime de Deno no aplica ICU completo).
const eur = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '€';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const body = await req.json();
    const {
      nombre_cliente = '', empresa = '', sector = '', pack = 'core',
      url_web = '', dolor_principal = '', presupuesto_mensual = '', notas = '',
    } = body ?? {};

    const packKey = String(pack).toLowerCase();
    const P = PACKS[packKey] ?? PACKS.core;
    const T = TERMS[packKey] ?? TERMS.core;
    const R = ROI[String(sector).toLowerCase()] ?? ROI_DEFAULT;

    const ahorroMes = Math.round((R.horas * 4.33 * 20) / 10) * 10; // ~20€/h
    const costeNoActuar = ahorroMes + P.mensual;

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY no configurada' }, 500);

    const SYSTEM = [
      'Eres un copywriter comercial senior de WhiteMoon Agencia IA (agentes IA conversacionales y webs con SEO para pymes en Espana).',
      'Escribes propuestas comerciales persuasivas, cercanas y profesionales, en espanol de Espana.',
      'Devuelves EXCLUSIVAMENTE un objeto JSON valido (sin markdown, sin texto fuera del JSON) con estas claves:',
      '- resumen_ejecutivo: 2-3 parrafos en HTML (<p>...</p>) dirigidos al cliente, conectando su sector con el valor de un agente IA.',
      '- problema: 1-2 parrafos en HTML sobre el problema concreto de su sector, partiendo del dolor indicado.',
      '- solucion: 1-2 parrafos en HTML que presentan el pack recomendado aplicado a su sector.',
      '- features: array de 6 features concretas y especificas del sector y pack (frases cortas).',
      '- roi_intro: 1 frase introduciendo el retorno de inversion.',
      '- caso_exito: 1 parrafo en HTML. Si el sector es restaurante, usa el cliente real Bambu Sushi (Cordoba, Pack Core: web + SEO + chatbot de reservas y pedidos). Para CUALQUIER OTRO sector, describe resultados tipicos del sector SIN inventar nombres de clientes ni testimonios ficticios.',
      'Reglas: usa solo los datos proporcionados; no inventes precios, plazos ni testimonios; tono honesto orientado a resultados; HTML simple (solo <p>, <strong>, <em>); todas las claves con comillas dobles JSON estandar.',
    ].join('\n');

    const USER = [
      'Datos del cliente para la propuesta:',
      '- Cliente: ' + (nombre_cliente || '(sin nombre)'),
      '- Empresa: ' + (empresa || '(sin empresa)'),
      '- Sector: ' + (sector || '(generico)'),
      '- Pack recomendado: ' + P.label + ' (' + P.cap + ')',
      '- Web actual: ' + (url_web || '(no indica)'),
      '- Dolor principal: ' + (dolor_principal || '(no indica)'),
      '- Presupuesto mensual aproximado: ' + (presupuesto_mensual ? presupuesto_mensual + '€/mes' : '(no indica)'),
      '- Notas de la llamada: ' + (notas || '(ninguna)'),
      '- ROI de referencia del sector: ' + R.metric + '; ahorro ~' + R.horas + 'h/semana.',
      'Genera el JSON de la propuesta.',
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
    let raw = (data.content?.[0]?.text || '{}').trim();
    raw = raw.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();

    let ai: Record<string, unknown> = {};
    try {
      ai = JSON.parse(raw);
    } catch {
      const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
      if (s >= 0 && e > s) { try { ai = JSON.parse(raw.slice(s, e + 1)); } catch { /* noop */ } }
    }

    const resumen = String(ai.resumen_ejecutivo || ('<p>Propuesta de automatizacion con IA para ' + esc(empresa || nombre_cliente) + '.</p>'));
    const problema = String(ai.problema || '');
    const solucion = String(ai.solucion || '');
    const features = Array.isArray(ai.features) && ai.features.length
      ? (ai.features as unknown[]).map((f) => String(f))
      : [P.cap, 'Captacion de leads 24/7', 'Respuestas inmediatas', 'Cualificacion automatica', 'Aviso instantaneo por WhatsApp', 'Web + SEO incluidos'];
    const roiIntro = String(ai.roi_intro || 'Estimacion de retorno para tu negocio:');
    const caso = String(ai.caso_exito || '');

    const html = assemble({ nombre_cliente, empresa, sector, P, T, R, ahorroMes, costeNoActuar, resumen, problema, solucion, features, roiIntro, caso });
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
  const P = d.P, T = d.T, R = d.R;
  const featuresHtml = d.features.map((f: string) => '<li>' + esc(f) + '</li>').join('');
  const metricCorto = esc(String(R.metric).split('·')[0].trim());

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
    ".roi .c .n{font-size:1.5rem;font-weight:800;color:var(--accent);letter-spacing:-.02em}",
    ".roi .c .l{font-size:.74rem;color:var(--muted);margin-top:4px}",
    ".precio{display:flex;gap:18px;flex-wrap:wrap;margin-top:6px}",
    ".precio .box{flex:1;min-width:200px;border:2px solid var(--purple);border-radius:14px;padding:20px;background:linear-gradient(135deg,rgba(124,77,255,.06),rgba(0,212,170,.06))}",
    ".precio .box .pk{font-size:.8rem;color:var(--purple);font-weight:700;text-transform:uppercase;letter-spacing:.08em}",
    ".precio .box .big{font-size:1.7rem;font-weight:800;margin:6px 0;letter-spacing:-.02em}",
    ".precio .box .sub{color:#555;font-size:.85rem}",
    ".precio .box .cap{margin-top:10px;font-size:.84rem;color:#333}",
    ".noact{flex:1;min-width:200px;border:1px dashed #d33;border-radius:14px;padding:20px;background:#fff5f5}",
    ".noact .t{color:#c00;font-weight:700;font-size:.85rem;text-transform:uppercase;letter-spacing:.06em}",
    ".noact .big{font-size:1.7rem;font-weight:800;color:#c00;margin:6px 0}",
    ".noact .sub{color:#a33;font-size:.85rem}",
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
    "<section><h2>La solucion: Pack " + esc(P.label) + "</h2>" + d.solucion + "<ul class='feat'>" + featuresHtml + "</ul></section>",
    "<section><h2>ROI estimado</h2><p>" + esc(d.roiIntro) + "</p><div class='roi'>",
    "<div class='c'><div class='n'>" + R.horas + "h</div><div class='l'>ahorradas / semana</div></div>",
    "<div class='c'><div class='n'>" + metricCorto + "</div><div class='l'>en tu sector</div></div>",
    "<div class='c'><div class='n'>~" + eur(d.ahorroMes) + "</div><div class='l'>ahorro estimado / mes</div></div>",
    "</div></section>",
    "<section><h2>Inversion</h2><div class='precio'>",
    "<div class='box'><div class='pk'>Pack " + esc(P.label) + "</div><div class='big'>" + eur(P.setup) + " <span style='font-size:.9rem;font-weight:500'>setup</span></div><div class='sub'>+ " + eur(P.mensual) + "/mes</div><div class='cap'>" + esc(P.cap) + "</div></div>",
    "<div class='noact'><div class='t'>Coste de no actuar</div><div class='big'>~" + eur(d.costeNoActuar) + "/mes</div><div class='sub'>en horas perdidas y oportunidades sin captar cada mes que pasa.</div></div>",
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
