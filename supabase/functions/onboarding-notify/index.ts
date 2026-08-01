import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// onboarding-notify — avisa por WhatsApp cuando se da de alta un cliente nuevo.
// Mensaje:
//   🚀 Nuevo cliente en onboarding: [nombre] · Pack [pack] · Sector [sector] · Token: [token]
//
// Se invoca de dos formas (ambas soportadas):
//   1) Database Webhook (trigger pg_net) → payload { type, table, record:{...fila...} }
//   2) Llamada directa → payload { nombre, pack, sector, token, telefono }
//
// Proveedor de envío configurable por env (Project Settings → Edge Functions → Secrets):
//   CALLMEBOT_APIKEY    → usa api.callmebot.com (GET phone+text+apikey)
//   WHATSAPP_NOTIFY_URL → POST genérico { phone, message } (Twilio proxy, etc.)
// Si no hay ninguno configurado, registra el mensaje en logs y devuelve ok
// (nunca rompe el flujo de creación del onboarding).

const NOTIFY_PHONE = "+34643199580"; // Cristobal

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  // Database Webhook envía la fila en `record`; la llamada directa manda los campos sueltos.
  const rec: Record<string, unknown> =
    payload.record && typeof payload.record === "object"
      ? payload.record as Record<string, unknown>
      : {};

  const nombre = String(payload.nombre ?? rec.cliente_nombre ?? "—");
  const pack = String(payload.pack ?? rec.pack ?? "—");
  const sector = String(payload.sector ?? rec.sector ?? "—");
  const token = String(payload.token ?? payload.token_cdn ?? rec.token_cdn ?? "—");

  const message =
    `🚀 Nuevo cliente en onboarding: ${nombre} · Pack ${pack} · Sector ${sector} · Token: ${token}`;

  const callmebotKey = Deno.env.get("CALLMEBOT_APIKEY");
  const webhookUrl = Deno.env.get("WHATSAPP_NOTIFY_URL");

  let sent = false;
  let provider = "none";
  try {
    if (callmebotKey) {
      provider = "callmebot";
      const url =
        `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(NOTIFY_PHONE)}` +
        `&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(callmebotKey)}`;
      const r = await fetch(url);
      sent = r.ok;
    } else if (webhookUrl) {
      provider = "webhook";
      const r = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: NOTIFY_PHONE, message }),
      });
      sent = r.ok;
    } else {
      console.warn("[onboarding-notify] sin proveedor configurado, mensaje:", message);
    }
  } catch (e) {
    provider = "error";
    console.error("[onboarding-notify] error enviando WhatsApp:", e);
  }

  // Si vino del webhook (tenemos record.id) y se envió, incrementa el contador.
  const recId = rec.id;
  if (sent && recId) {
    try {
      const supaUrl = Deno.env.get("SUPABASE_URL");
      const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supaUrl && service) {
        await fetch(`${supaUrl}/rest/v1/onboarding_clientes?id=eq.${recId}`, {
          method: "PATCH",
          headers: {
            apikey: service,
            Authorization: `Bearer ${service}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({
            whatsapp_enviados: (Number(rec.whatsapp_enviados) || 0) + 1,
          }),
        });
      }
    } catch (e) {
      console.warn("[onboarding-notify] no se pudo actualizar whatsapp_enviados:", e);
    }
  }

  return json({ ok: true, sent, provider, message });
});
