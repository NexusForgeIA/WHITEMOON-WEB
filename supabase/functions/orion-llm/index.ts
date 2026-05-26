import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// orion-llm — Custom LLM endpoint para Retell (v1).
//
// Retell invoca este endpoint en cada turno de conversación usando el formato
// OpenAI Chat Completions. La función:
//
//   1. Extrae el token CDN del cliente (body.call.metadata.token o headers).
//   2. Carga el cliente de onboarding_clientes vía SERVICE_ROLE (bypass RLS),
//      filtrando por estado='completado' (clientes ya en producción).
//   3. Cross-check: si Retell envía agent_id en metadata, debe coincidir con
//      el agente_retell_agent_id del cliente (defense in depth).
//   4. Llama a Claude Haiku 4.5 con el system_prompt del cliente.
//   5. Registra el consumo en orion_usage (fire-and-forget, no bloquea).
//   6. Devuelve la respuesta en formato OpenAI chat.completion.
//
// Auth: verify_jwt=false. La autenticación es propia vía token_cdn.
//
// Variables de entorno requeridas (Deno.env.get):
//   - ANTHROPIC_API_KEY        (clave API de Anthropic)
//   - SUPABASE_URL             (inyectada automáticamente por Supabase)
//   - SUPABASE_SERVICE_ROLE_KEY (inyectada automáticamente por Supabase)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-orion-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 200;

// Pricing Claude Haiku 4.5 (USD por token).
const COST_INPUT = 0.00000025;  // 0,25 USD / millón
const COST_OUTPUT = 0.00000125; // 1,25 USD / millón

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method not allowed" }, 405);
  }

  // ───── 1) Parse body ─────
  // deno-lint-ignore no-explicit-any
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  // ───── 2) Extraer token (body preferente, header como fallback) ─────
  const tokenFromBody = body?.call?.metadata?.token;
  const tokenFromHeader =
    req.headers.get("x-orion-token") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const token = String(tokenFromBody || tokenFromHeader || "").trim();
  if (!token) {
    return json({ error: "token requerido" }, 401);
  }

  // ───── 3) Resolver cliente con SERVICE_ROLE ─────
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[orion-llm] falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "servicio no configurado" }, 500);
  }

  // Importante: filtrar por estado='completado' (clientes ya operativos en producción).
  // El enum actual no tiene 'activo'; 'completado' es el estado para clientes desplegados.
  const clienteUrl =
    `${supabaseUrl}/rest/v1/onboarding_clientes` +
    `?token_cdn=eq.${encodeURIComponent(token)}` +
    `&estado=eq.completado` +
    `&select=token_cdn,agente_system_prompt,agente_retell_agent_id,cliente_nombre` +
    `&limit=1`;

  const clienteRes = await fetch(clienteUrl, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!clienteRes.ok) {
    console.error(
      "[orion-llm] error consultando cliente:",
      clienteRes.status,
      await clienteRes.text().catch(() => ""),
    );
    return json({ error: "error interno" }, 500);
  }

  const clientes = await clienteRes.json().catch(() => []);
  const cliente = Array.isArray(clientes) ? clientes[0] : null;
  if (!cliente) {
    console.warn("[orion-llm] token no válido o cliente inactivo:", token);
    return json({ error: "token no válido o cliente inactivo" }, 403);
  }

  // Defense in depth: si Retell envía agent_id en metadata, debe coincidir.
  const agentIdFromBody = String(body?.call?.metadata?.agent_id ?? "").trim();
  const agentIdFromDb = String(cliente.agente_retell_agent_id ?? "").trim();
  if (agentIdFromBody && agentIdFromDb && agentIdFromBody !== agentIdFromDb) {
    console.warn(
      "[orion-llm] agent_id no coincide (token=" + token + "):",
      "body=" + agentIdFromBody,
      "db=" + agentIdFromDb,
    );
    return json({ error: "agent_id no coincide con token" }, 403);
  }

  const systemPrompt = String(cliente.agente_system_prompt || "").trim();
  if (!systemPrompt) {
    console.error("[orion-llm] cliente sin agente_system_prompt:", token);
    return json({ error: "prompt no configurado" }, 500);
  }

  // ───── 4) Convertir historial OpenAI → Anthropic ─────
  // OpenAI puede llevar role:"system" mezclado en messages; Anthropic lo
  // recibe aparte como parámetro `system`. Filtramos solo user/assistant.
  const incomingMessages = Array.isArray(body.messages) ? body.messages : [];
  // deno-lint-ignore no-explicit-any
  const messages = incomingMessages
    // deno-lint-ignore no-explicit-any
    .filter((m: any) => m && (m.role === "user" || m.role === "assistant"))
    // deno-lint-ignore no-explicit-any
    .map((m: any) => ({
      role: m.role,
      content: String(m.content ?? ""),
    }));

  // Anthropic requiere al menos un mensaje. Si Retell hace primer turno vacío,
  // sembramos un saludo neutro para que el modelo arranque la conversación.
  if (messages.length === 0) {
    messages.push({ role: "user", content: "Hola" });
  }

  // ───── 5) Llamar a Claude ─────
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    console.error("[orion-llm] falta ANTHROPIC_API_KEY");
    return json({ error: "servicio no configurado" }, 500);
  }

  // deno-lint-ignore no-explicit-any
  let claudeData: any = null;
  try {
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text().catch(() => "");
      console.error(
        "[orion-llm] Claude respondió error:",
        claudeRes.status,
        errBody,
      );
      return json({ error: "error del modelo" }, 502);
    }
    claudeData = await claudeRes.json();
  } catch (e) {
    console.error("[orion-llm] error llamando a Claude:", e);
    return json({ error: "error interno" }, 500);
  }

  // ───── 6) Extraer respuesta y métricas ─────
  const reply = Array.isArray(claudeData?.content)
    // deno-lint-ignore no-explicit-any
    ? claudeData.content.map((c: any) => c?.text || "").join("").trim()
    : "";
  const inputTokens = Number(claudeData?.usage?.input_tokens || 0);
  const outputTokens = Number(claudeData?.usage?.output_tokens || 0);
  const costeUsd = inputTokens * COST_INPUT + outputTokens * COST_OUTPUT;

  // ───── 7) Log de consumo en orion_usage (fire-and-forget) ─────
  // No bloqueamos la respuesta; un fallo en el log no debe romper la llamada.
  fetch(`${supabaseUrl}/rest/v1/orion_usage`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      token_cdn: token,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      coste_estimado_usd: costeUsd.toFixed(8),
    }),
  }).catch((e) => {
    console.warn("[orion-llm] log orion_usage falló (no bloquea):", e);
  });

  // ───── 8) Devolver formato OpenAI chat.completion ─────
  return json({
    id: `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: CLAUDE_MODEL,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: reply,
        },
        finish_reason:
          claudeData?.stop_reason === "max_tokens" ? "length" : "stop",
      },
    ],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
    },
  });
});
