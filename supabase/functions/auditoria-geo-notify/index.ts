import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// auditoria-geo-notify — notifica por WhatsApp una nueva solicitud de
// Auditoría GEO IA enviada desde la landing /auditoria-geo-ia/.
//
// Recibe (POST JSON): { nombre, empresa, url, telefono, sector } para la
// Auditoría GEO IA, o { nombre, telefono, sector, origen, mensaje } para
// avisos genéricos de otras landings (ej. Pack Ads).
// El lead ya se inserta en leads_web desde el cliente (origen='auditoria-geo-ia');
// esta función SOLO envía la notificación WhatsApp vía CallMeBot, manteniendo
// la apikey EXCLUSIVAMENTE en server-side (Deno.env.get).
//
// Regla del proyecto: si el envío falla → console.warn, nunca interrumpe nada.
// Las claves SOLO vienen de Deno.env.get().
//
// Desplegar SIEMPRE con:
//   supabase functions deploy auditoria-geo-notify --no-verify-jwt --project-ref mlaqtniujnvfxcvcourm

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
  const empresa = String(data.empresa ?? "").trim();
  const url = String(data.url ?? "").trim();
  const telefono = String(data.telefono ?? "").trim();
  const sector = String(data.sector ?? "").trim();
  const origen = String(data.origen ?? "").trim();
  const mensaje = String(data.mensaje ?? "").trim();

  // Si llega `mensaje`, es una solicitud genérica (ej. Pack Ads): construimos
  // un aviso a partir de origen/mensaje. Si no, mantenemos el formato original
  // de la Auditoría GEO IA (retrocompatible con la landing /auditoria-geo-ia/).
  const message = mensaje
    ? `🔔 Nueva solicitud${origen ? " (" + origen + ")" : ""}: ` +
      `${nombre} · ${telefono} · ${sector}\n${mensaje}`
    : `🔍 Nueva solicitud Auditoría GEO IA: ` +
      `${nombre} · ${empresa} · ${url} · ${telefono} · ${sector}`;

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
        console.warn("[auditoria-geo-notify] CallMeBot falló:", r.status);
      }
    } else {
      console.warn("[auditoria-geo-notify] sin CALLMEBOT_APIKEY, mensaje:", message);
    }
  } catch (e) {
    console.warn("[auditoria-geo-notify] error enviando WhatsApp:", e);
  }

  return json({ ok: true, notified });
});
