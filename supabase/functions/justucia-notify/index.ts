import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// justucia-notify — notifica por WhatsApp una nueva solicitud de demo del
// CRM legal JusticIA enviada desde la landing /justucia/.
//
// Recibe (POST JSON): { nombre, telefono, despacho, area }.
// El lead ya se inserta en leads_web desde el cliente (origen='justucia-landing');
// esta función SOLO envía la notificación WhatsApp vía CallMeBot, manteniendo
// la apikey EXCLUSIVAMENTE en server-side (Deno.env.get).
//
// Regla del proyecto: si el envío falla → console.warn, nunca interrumpe nada.
// Las claves SOLO vienen de Deno.env.get().
//
// Desplegar SIEMPRE con:
//   supabase functions deploy justucia-notify --no-verify-jwt --project-ref mlaqtniujnvfxcvcourm

const NOTIFY_PHONE = "34643199580"; // Cristobal

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

  const data = (payload.args ?? payload) as Record<string, unknown>;
  const nombre = String(data.nombre ?? "").trim();
  const telefono = String(data.telefono ?? "").trim();
  const despacho = String(data.despacho ?? "").trim();
  const area = String(data.area ?? "").trim();

  const message =
    `⚖️ JusticIA Demo · ${nombre} · ${telefono} · ${despacho} · ${area}`;

  let notified = false;
  try {
    const callmebotKey = Deno.env.get("CALLMEBOT_APIKEY");
    if (callmebotKey) {
      const notifyUrl =
        `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(NOTIFY_PHONE)}` +
        `&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(callmebotKey)}`;
      const r = await fetch(notifyUrl);
      notified = r.ok;
      if (!r.ok) {
        console.warn("[justucia-notify] CallMeBot falló:", r.status);
      }
    } else {
      console.warn("[justucia-notify] sin CALLMEBOT_APIKEY, mensaje:", message);
    }
  } catch (e) {
    console.warn("[justucia-notify] error enviando WhatsApp:", e);
  }

  return json({ ok: true, notified });
});
