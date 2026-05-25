import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// retell-web-call — crea una web call de Retell para el widget de voz Luna IA.
//
// El frontend NUNCA debe tener la RETELL_API_KEY. Esta función actúa de proxy:
// recibe { agent_id }, llama a la Retell API con la key (solo Deno.env.get) y
// devuelve { access_token } para que el SDK del navegador inicie la llamada.
//
// verify_jwt: false (endpoint público invocado desde whitemoon.es).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

  const agentId = String(payload.agent_id ?? "").trim();
  if (!agentId) {
    return json({ error: "agent_id requerido" }, 400);
  }

  const apiKey = Deno.env.get("RETELL_API_KEY");
  if (!apiKey) {
    console.error("[retell-web-call] falta RETELL_API_KEY");
    return json({ error: "servicio no configurado" }, 500);
  }

  try {
    const r = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent_id: agentId }),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok || !data.access_token) {
      console.error("[retell-web-call] Retell respondió error:", r.status, data);
      return json({ error: "no se pudo crear la llamada" }, 502);
    }

    return json({ access_token: data.access_token, call_id: data.call_id ?? null });
  } catch (e) {
    console.error("[retell-web-call] error llamando a Retell:", e);
    return json({ error: "error interno" }, 500);
  }
});
