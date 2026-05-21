import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// upsell-trigger — Módulo 4 (upsell automático).
// Detecta oportunidades de upgrade (RPC detect_upsell_opportunities), genera una
// propuesta breve con Claude (haiku) y avisa por WhatsApp al equipo:
//   "🚀 Oportunidad upsell: [nombre] lleva [X] días en [pack actual].
//    Propuesta [siguiente pack]: [precio]. ¿Contactamos?"
// La propuesta generada se guarda en upsell_oportunidades.notas.
//
// Triggers (cliente con onboarding completado):
//   Spark→Core +60d · Core→Scale +90d · Scale→Elite +120d
//
// Disparo: cron diario (08:15 UTC) o manual.
// Despliegue: verify_jwt = false · usa CALLMEBOT_APIKEY + ANTHROPIC_API_KEY.

const NOTIFY_PHONE = "+34643199580";

const PACKS: Record<string, { label: string; setup: number; mensual: number }> = {
  spark: { label: "Spark", setup: 499,  mensual: 199 },
  core:  { label: "Core",  setup: 1800, mensual: 199 },
  scale: { label: "Scale", setup: 4500, mensual: 449 },
  elite: { label: "Elite", setup: 8500, mensual: 599 },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const eur = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "€";

async function sendWhatsApp(message: string): Promise<boolean> {
  const callmebotKey = Deno.env.get("CALLMEBOT_APIKEY");
  const webhookUrl = Deno.env.get("WHATSAPP_NOTIFY_URL");
  try {
    if (callmebotKey) {
      const url =
        `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(NOTIFY_PHONE)}` +
        `&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(callmebotKey)}`;
      return (await fetch(url)).ok;
    }
    if (webhookUrl) {
      const r = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: NOTIFY_PHONE, message }),
      });
      return r.ok;
    }
    console.warn("[upsell-trigger] sin proveedor WhatsApp, mensaje:", message);
    return false;
  } catch (e) {
    console.error("[upsell-trigger] error WhatsApp:", e);
    return false;
  }
}

async function generarPropuesta(nombre: string, sector: string, actual: string, propuesto: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return "";
  const A = PACKS[actual], P = PACKS[propuesto];
  const SYSTEM = [
    "Eres un asesor comercial senior de WhiteMoon Agencia IA (agentes IA y webs con SEO para pymes en España).",
    "Redactas un argumentario breve y honesto para proponer a un cliente actual un upgrade de pack.",
    "Devuelves SOLO texto plano (sin markdown), 2-3 frases, en español de España, tono cercano y orientado a resultados.",
    "No inventes cifras, precios, plazos ni testimonios. Céntrate en el salto de valor entre packs aplicado a su sector.",
  ].join("\n");
  const USER = [
    `Cliente: ${nombre || "(sin nombre)"}`,
    `Sector: ${sector || "(genérico)"}`,
    `Pack actual: ${A?.label ?? actual}`,
    `Pack propuesto: ${P?.label ?? propuesto} (${eur(P?.setup ?? 0)} setup + ${eur(P?.mensual ?? 0)}/mes)`,
    "Redacta el argumentario de upgrade.",
  ].join("\n");
  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: SYSTEM,
        messages: [{ role: "user", content: USER }],
      }),
    });
    if (!resp.ok) { console.warn("[upsell-trigger] Claude error:", await resp.text()); return ""; }
    const data = await resp.json();
    return String(data.content?.[0]?.text ?? "").trim();
  } catch (e) {
    console.warn("[upsell-trigger] Claude excepción:", e);
    return "";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supaUrl = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!supaUrl || !key) return json({ error: "Faltan SUPABASE_URL / key" }, 500);
  const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  // 1) Detectar e insertar oportunidades nuevas (devuelve solo las recién creadas).
  let nuevas: Record<string, unknown>[] = [];
  try {
    const r = await fetch(`${supaUrl}/rest/v1/rpc/detect_upsell_opportunities`, {
      method: "POST", headers: H, body: "{}",
    });
    if (!r.ok) return json({ error: "detect_upsell_opportunities falló", details: await r.text() }, 502);
    nuevas = await r.json();
  } catch (e) {
    return json({ error: "Error detectando upsell", details: String(e) }, 500);
  }

  if (!nuevas.length) return json({ ok: true, nuevas: 0, results: [] });

  // 2) Datos de los clientes implicados (nombre, sector, fecha_completado).
  const ids = [...new Set(nuevas.map((o) => String(o.cliente_id)).filter(Boolean))];
  const clientes: Record<string, Record<string, unknown>> = {};
  try {
    const inList = ids.map((i) => `"${i}"`).join(",");
    const r = await fetch(
      `${supaUrl}/rest/v1/onboarding_clientes?id=in.(${inList})&select=id,cliente_nombre,sector,fecha_completado`,
      { headers: H },
    );
    if (r.ok) for (const c of await r.json()) clientes[String(c.id)] = c;
  } catch { /* seguimos con datos mínimos */ }

  const results: Array<{ cliente: string; pack: string; sent: boolean }> = [];

  for (const op of nuevas) {
    const c = clientes[String(op.cliente_id)] ?? {};
    const nombre = String(c.cliente_nombre ?? "Cliente");
    const sector = String(c.sector ?? "");
    const actual = String(op.pack_actual);
    const propuesto = String(op.pack_propuesto);
    const P = PACKS[propuesto];
    const dias = c.fecha_completado
      ? Math.floor((Date.now() - new Date(String(c.fecha_completado)).getTime()) / 86400000)
      : null;

    const propuesta = await generarPropuesta(nombre, sector, actual, propuesto);

    const precioLabel = P ? `${eur(P.setup)} setup + ${eur(P.mensual)}/mes` : "según pack";
    const message =
      `🚀 Oportunidad upsell: ${nombre} lleva ${dias ?? "+"} días en ${PACKS[actual]?.label ?? actual}. ` +
      `Propuesta ${P?.label ?? propuesto}: ${precioLabel}. ¿Contactamos?`;
    const sent = await sendWhatsApp(message);

    if (propuesta) {
      try {
        await fetch(`${supaUrl}/rest/v1/upsell_oportunidades?id=eq.${op.id}`, {
          method: "PATCH",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify({ notas: propuesta }),
        });
      } catch (e) { console.warn("[upsell-trigger] no se pudo guardar la propuesta:", e); }
    }

    results.push({ cliente: nombre, pack: `${actual}→${propuesto}`, sent });
  }

  return json({ ok: true, nuevas: nuevas.length, results });
});
