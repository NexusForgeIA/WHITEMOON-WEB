import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// luna-lead-capture — captura leads de Luna IA (asistente de voz en web).
//
// Recibe (POST JSON): { nombre, telefono, sector, mensaje }
//
// 1) INSERT en leads_web vía REST (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
//    origen = 'LUNA-VOZ-WEB', fecha = NOW() (ISO).
// 2) Notifica por WhatsApp vía CallMeBot (CALLMEBOT_APIKEY).
//
// Regla del proyecto: si el envío a Supabase o WhatsApp falla → console.warn,
// NUNCA se interrumpe el flujo. Las claves SOLO vienen de Deno.env.get().
//
// verify_jwt: false (endpoint público invocado desde la web).

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

  const nombre = String(payload.nombre ?? "").trim();
  const telefono = String(payload.telefono ?? "").trim();
  const sector = String(payload.sector ?? "").trim();
  const mensaje = String(payload.mensaje ?? "").trim();

  // El teléfono es el dato clave de un lead de voz; sin él no hay nada que capturar.
  if (!telefono) {
    return json({ ok: false, error: "telefono requerido" }, 400);
  }

  // 1) INSERT en leads_web
  let saved = false;
  try {
    const supaUrl = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supaUrl && service) {
      const r = await fetch(`${supaUrl}/rest/v1/leads_web`, {
        method: "POST",
        headers: {
          apikey: service,
          Authorization: `Bearer ${service}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          nombre,
          telefono,
          sector,
          origen: "LUNA-VOZ-WEB",
          mensaje,
          fecha: new Date().toISOString(),
        }),
      });
      saved = r.ok;
      if (!r.ok) {
        console.warn(
          "[luna-lead-capture] insert leads_web falló:",
          r.status,
          await r.text(),
        );
      }
    } else {
      console.warn("[luna-lead-capture] faltan SUPABASE_URL/SERVICE_ROLE_KEY");
    }
  } catch (e) {
    console.warn("[luna-lead-capture] error insertando lead:", e);
  }

  // 2) Notificar por WhatsApp (CallMeBot)
  const message =
    `🎙️ Lead Luna IA\n` +
    `Nombre: ${nombre}\n` +
    `Teléfono: ${telefono}\n` +
    `Sector: ${sector}\n` +
    `${mensaje}`;

  let notified = false;
  try {
    const callmebotKey = Deno.env.get("CALLMEBOT_APIKEY");
    if (callmebotKey) {
      const url =
        `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(NOTIFY_PHONE)}` +
        `&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(callmebotKey)}`;
      const r = await fetch(url);
      notified = r.ok;
      if (!r.ok) {
        console.warn("[luna-lead-capture] CallMeBot falló:", r.status);
      }
    } else {
      console.warn("[luna-lead-capture] sin CALLMEBOT_APIKEY, mensaje:", message);
    }
  } catch (e) {
    console.warn("[luna-lead-capture] error enviando WhatsApp:", e);
  }

  return json({ ok: true, saved, notified });
});
