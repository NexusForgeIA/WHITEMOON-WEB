import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// onboarding-notify — avisa por WhatsApp cuando se da de alta un cliente nuevo.
// Mensaje:
//   🚀 Nuevo cliente en onboarding: [nombre] · Pack [pack] · Sector [sector] · Token: [token]
//
// Proveedor de envío configurable por env (Project Settings → Edge Functions → Secrets):
//   CALLMEBOT_APIKEY    → usa api.callmebot.com (GET phone+text+apikey)
//   WHATSAPP_NOTIFY_URL → POST genérico { phone, message } (Twilio proxy, n8n, etc.)
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

  const nombre = String(payload.nombre ?? "—");
  const pack = String(payload.pack ?? "—");
  const sector = String(payload.sector ?? "—");
  const token = String(payload.token ?? payload.token_cdn ?? "—");

  const message =
    `🚀 Nuevo cliente en onboarding: ${nombre} · Pack ${pack} · Sector ${sector} · Token: ${token}`;

  const callmebotKey = Deno.env.get("CALLMEBOT_APIKEY");
  const webhookUrl = Deno.env.get("WHATSAPP_NOTIFY_URL");

  try {
    if (callmebotKey) {
      const url =
        `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(NOTIFY_PHONE)}` +
        `&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(callmebotKey)}`;
      const r = await fetch(url);
      return json({ ok: true, sent: r.ok, provider: "callmebot", message });
    }

    if (webhookUrl) {
      const r = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: NOTIFY_PHONE, message }),
      });
      return json({ ok: true, sent: r.ok, provider: "webhook", message });
    }

    // Sin proveedor configurado: no rompemos nada, dejamos rastro en logs.
    console.warn("[onboarding-notify] sin proveedor configurado, mensaje:", message);
    return json({ ok: true, sent: false, provider: "none", message });
  } catch (e) {
    console.error("[onboarding-notify] error enviando WhatsApp:", e);
    return json({ ok: true, sent: false, provider: "error", message });
  }
});
