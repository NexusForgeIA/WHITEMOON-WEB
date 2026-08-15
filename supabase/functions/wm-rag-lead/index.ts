// ════════════════════════════════════════════════════════════════
// wm-rag-lead · Edge Function (Supabase / Deno)
// ----------------------------------------------------------------
// Captura del lead del chatbot RAG de whitemoon.es.
//
// verify_jwt: FALSE — se llama desde el navegador sin sesión.
//
// A diferencia de assets/calc-lead.js (que inserta en leads_web desde
// el cliente con la anon key a la vista), aquí el INSERT lo hace esta
// función con service_role: el navegador no ve ninguna clave. El aviso
// de Telegram sale de la misma llamada, así que el widget hace UNA
// petición y el token del bot nunca sale del servidor.
//
// Body (JSON): { nombre, telefono, mensaje?, interes?, sector?, pagina? }
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ORIGENES_OK = [
  "https://whitemoon.es",
  "https://www.whitemoon.es",
  "https://nexusforgeia.github.io",
  "http://localhost:8000",
  "http://127.0.0.1:8000",
];

function cors(origin: string | null) {
  const permitido = origin && ORIGENES_OK.includes(origin) ? origin : ORIGENES_OK[0];
  return {
    "Access-Control-Allow-Origin": permitido,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

const limpio = (v: unknown, max = 400) => String(v ?? "").trim().slice(0, max);

Deno.serve(async (req: Request) => {
  const corsHeaders = cors(req.headers.get("origin"));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  let payload: Record<string, unknown> = {};
  try { payload = await req.json(); } catch { payload = {}; }

  const nombre = limpio(payload.nombre, 120);
  const telefono = limpio(payload.telefono, 40);

  // Guard de lead incompleto — estándar WhiteMoon: sin nombre Y teléfono
  // no se inserta nada ni se avisa.
  if (!nombre || !telefono) return json({ ok: false, error: "lead incompleto" }, 400);

  const sector = limpio(payload.sector, 80) || "whitemoon";
  const interes = limpio(payload.interes, 200) || "Consulta desde el chat IA de la web";
  const mensaje = limpio(payload.mensaje, 1500) || interes;
  const pagina = limpio(payload.pagina, 200);

  // Regla CLAUDE.md: payload completo a leads_web.
  const lead = {
    nombre,
    telefono,
    sector,
    interes,
    mensaje: pagina ? `${mensaje}\n(desde ${pagina})` : mensaje,
    origen: "rag-web",
    fecha: new Date().toISOString(),
    preferencia: "llamada",
  };

  let guardado = false;
  try {
    const supabase = createClient(SB_URL, SB_SERVICE_KEY);
    const { error } = await supabase.from("leads_web").insert(lead);
    if (error) console.warn("[wm-rag-lead] insert falló:", error.message);
    else guardado = true;
  } catch (e) {
    console.warn("[wm-rag-lead] error insertando lead:", e);
  }

  // Aviso al móvil / departamento asignado. Best-effort: si Telegram
  // falla, el lead ya está en la tabla y el visitante no se entera.
  let notificado = false;
  const texto =
    `Nuevo lead WhiteMoon (chat IA web)\n` +
    `Nombre: ${nombre} | Tel: ${telefono}\n` +
    `Interes: ${interes}` +
    (pagina ? `\nPagina: ${pagina}` : "") +
    (mensaje && mensaje !== interes ? `\n${mensaje}` : "") +
    (guardado ? "" : "\n[AVISO] no se pudo guardar en leads_web");

  try {
    const tgToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const tgChat = Deno.env.get("TELEGRAM_CHAT_ID");
    if (tgToken && tgChat) {
      const r = await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: tgChat, text: texto }),
      });
      notificado = r.ok;
      if (!r.ok) console.warn("[wm-rag-lead] Telegram falló:", r.status, await r.text());
    } else {
      console.warn("[wm-rag-lead] sin TELEGRAM_BOT_TOKEN/CHAT_ID, mensaje:", texto);
    }
  } catch (e) {
    console.warn("[wm-rag-lead] error enviando Telegram:", e);
  }

  // Siempre 200 si el lead venía completo: el flujo del usuario nunca
  // se interrumpe por un fallo de infraestructura.
  return json({ ok: true, guardado, notificado });
});
