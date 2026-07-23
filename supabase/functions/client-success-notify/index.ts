import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// client-success-notify — Módulo 3 (client success automático).
// Revisa la salud de todos los clientes (RPC check_client_health) y avisa por
// WhatsApp de los que están en riesgo:
//   🔴 roja     → "⚠️ Cliente [nombre] lleva +3 días en [step]. Revisar onboarding."
//   🟡 amarilla → "💛 Cliente [nombre] lleva +30 días activo sin upsell. Oportunidad
//                  de upgrade a [siguiente pack]."
//
// Disparo:
//   · Cron diario (08:00 UTC) → revisa todos los clientes activos.
//   · Manual desde el panel → body { cliente_id } envía solo ese cliente.
//
// Despliegue: verify_jwt = false · usa CALLMEBOT_APIKEY (o WHATSAPP_NOTIFY_URL).
// Si el envío de WhatsApp falla nunca rompe el flujo (solo console.warn).

const NOTIFY_PHONE = "+34643199580"; // Cristobal
const REVISADO_SILENCIA_DIAS = 7;    // no reenviar si se revisó hace <7 días (modo automático)
const DAY_MS = 86400000;

// Claves = valores historicos de la BD; etiquetas = catalogo vigente 2026.
const PACK_LABEL: Record<string, string> = {
  spark: "Spark", core: "Core Spark Web", scale: "WhiteMoon 360", elite: "Core RAG",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendWhatsApp(message: string): Promise<{ sent: boolean; provider: string }> {
  const callmebotKey = Deno.env.get("CALLMEBOT_APIKEY");
  const webhookUrl = Deno.env.get("WHATSAPP_NOTIFY_URL");
  try {
    if (callmebotKey) {
      const url =
        `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(NOTIFY_PHONE)}` +
        `&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(callmebotKey)}`;
      const r = await fetch(url);
      return { sent: r.ok, provider: "callmebot" };
    }
    if (webhookUrl) {
      const r = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: NOTIFY_PHONE, message }),
      });
      return { sent: r.ok, provider: "webhook" };
    }
    console.warn("[client-success-notify] sin proveedor WhatsApp, mensaje:", message);
    return { sent: false, provider: "none" };
  } catch (e) {
    console.error("[client-success-notify] error enviando WhatsApp:", e);
    return { sent: false, provider: "error" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { payload = {}; }
  const targetId = payload.cliente_id ? String(payload.cliente_id) : null;
  const manual = !!targetId;

  const supaUrl = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!supaUrl || !key) return json({ error: "Faltan SUPABASE_URL / key" }, 500);

  // Salud de todos los clientes.
  let health: Record<string, unknown>[] = [];
  try {
    const r = await fetch(`${supaUrl}/rest/v1/rpc/check_client_health`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!r.ok) return json({ error: "check_client_health falló", details: await r.text() }, 502);
    health = await r.json();
  } catch (e) {
    return json({ error: "Error consultando salud", details: String(e) }, 500);
  }

  const now = Date.now();
  const results: Array<{ cliente: string; alerta: string; sent: boolean }> = [];

  for (const h of health) {
    const alerta = String(h.alerta);
    if (alerta !== "roja" && alerta !== "amarilla") continue;
    if (targetId && String(h.cliente_id) !== targetId) continue;

    // Modo automático: silencia si se revisó hace poco. Modo manual: siempre envía.
    if (!manual && h.revisado_at) {
      const rev = new Date(String(h.revisado_at)).getTime();
      if (now - rev < REVISADO_SILENCIA_DIAS * DAY_MS) continue;
    }

    const nombre = String(h.cliente_nombre ?? "—");
    let message: string;
    if (alerta === "roja") {
      message = `⚠️ Cliente ${nombre} lleva +3 días en ${String(h.step_actual ?? "el step actual")}. Revisar onboarding.`;
    } else {
      const next = PACK_LABEL[String(h.siguiente_pack)] ?? "el siguiente pack";
      message = `💛 Cliente ${nombre} lleva +30 días activo sin upsell. Oportunidad de upgrade a ${next}.`;
    }
    const { sent } = await sendWhatsApp(message);
    results.push({ cliente: nombre, alerta, sent });
  }

  return json({ ok: true, revisados: health.length, avisos: results.length, results });
});
