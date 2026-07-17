import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// electricistas-notify — notifica por WhatsApp un nuevo lead de la demo de
// electricista (/electricistas-madrid/). El lead ya se inserta en leads_web
// desde el cliente (origen='electricistas-demo'); esta función SOLO envía la
// notificación WhatsApp vía CallMeBot, manteniendo la apikey EXCLUSIVAMENTE
// server-side (Deno.env.get).
//
// Recibe (POST JSON): { nombre, telefono, sector, servicio, zona, origen }.
//
// Secrets usados (nunca en cliente):
//   - CALLMEBOT_APIKEY : apikey de CallMeBot
//   - WA_NUMBER        : teléfono destino (por defecto 34643199580 — Cristobal)
//
// Regla del proyecto: si el envío falla → console.warn, nunca interrumpe nada.
//
// Desplegar SIEMPRE con:
//   supabase functions deploy electricistas-notify --no-verify-jwt --project-ref mlaqtniujnvfxcvcourm

const DEFAULT_PHONE = "34643199580"; // Cristobal — se notifica SIEMPRE a este número

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
  const sector = String(data.sector ?? "electricista").trim();
  const servicio = String(data.servicio ?? "").trim();
  const zona = String(data.zona ?? "").trim();
  const origen = String(data.origen ?? "electricistas-demo").trim();

  const message =
    `🔔 Nuevo lead (${origen}) · ${sector}\n` +
    `Nombre: ${nombre || "-"}\n` +
    `Teléfono: ${telefono || "-"}\n` +
    `Servicio: ${servicio || "-"}\n` +
    `Zona: ${zona || "-"}`;

  const NOTIFY_PHONE = (Deno.env.get("WA_NUMBER") || DEFAULT_PHONE).trim();

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
        console.warn("[electricistas-notify] CallMeBot falló:", r.status);
      }
    } else {
      console.warn("[electricistas-notify] sin CALLMEBOT_APIKEY, mensaje:", message);
    }
  } catch (e) {
    console.warn("[electricistas-notify] error enviando WhatsApp:", e);
  }

  return json({ ok: true, notified });
});
