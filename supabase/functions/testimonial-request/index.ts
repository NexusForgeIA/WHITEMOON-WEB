import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// testimonial-request — Módulo 6 (casos de éxito).
// A los 30 días de completar el onboarding, avisa por WhatsApp para pedir
// testimonio al cliente:
//   "⭐ [nombre] lleva 30 días activo. Momento de pedir testimonio. Plantilla:
//    'Hola [nombre], ¿podrías compartir en 2 frases qué ha mejorado desde que
//     activaste el Agente IA?'"
// Marca testimonial_solicitado_at para no repetir el aviso.
//
// Disparo: cron diario (08:30 UTC) o manual con body { cliente_id }.
// Despliegue: verify_jwt = false · usa CALLMEBOT_APIKEY (o WHATSAPP_NOTIFY_URL).

const NOTIFY_PHONE = "+34643199580";
const DAY_MS = 86400000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.warn("[testimonial-request] sin proveedor WhatsApp, mensaje:", message);
    return false;
  } catch (e) {
    console.error("[testimonial-request] error WhatsApp:", e);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { payload = {}; }
  const targetId = payload.cliente_id ? String(payload.cliente_id) : null;

  const supaUrl = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!supaUrl || !key) return json({ error: "Faltan SUPABASE_URL / key" }, 500);
  const H = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  // Clientes completados hace +30 días sin testimonio solicitado.
  const hace30 = new Date(Date.now() - 30 * DAY_MS).toISOString();
  let query =
    `onboarding_clientes?select=id,cliente_nombre,fecha_completado,testimonial_solicitado_at` +
    `&estado=eq.completado&testimonial_solicitado_at=is.null`;
  query += targetId
    ? `&id=eq.${targetId}`
    : `&fecha_completado=lte.${encodeURIComponent(hace30)}`;

  let clientes: Record<string, unknown>[] = [];
  try {
    const r = await fetch(`${supaUrl}/rest/v1/${query}`, { headers: H });
    if (!r.ok) return json({ error: "consulta clientes falló", details: await r.text() }, 502);
    clientes = await r.json();
  } catch (e) {
    return json({ error: "Error consultando clientes", details: String(e) }, 500);
  }

  const results: Array<{ cliente: string; sent: boolean }> = [];
  for (const c of clientes) {
    const nombre = String(c.cliente_nombre ?? "Cliente");
    const message =
      `⭐ ${nombre} lleva 30 días activo. Momento de pedir testimonio. ` +
      `Plantilla: 'Hola ${nombre}, ¿podrías compartir en 2 frases qué ha mejorado desde que activaste el Agente IA?'`;
    const sent = await sendWhatsApp(message);
    try {
      await fetch(`${supaUrl}/rest/v1/onboarding_clientes?id=eq.${c.id}`, {
        method: "PATCH",
        headers: { ...H, Prefer: "return=minimal" },
        body: JSON.stringify({ testimonial_solicitado_at: new Date().toISOString() }),
      });
    } catch (e) { console.warn("[testimonial-request] no se pudo marcar solicitado:", e); }
    results.push({ cliente: nombre, sent });
  }

  return json({ ok: true, solicitados: results.length, results });
});
