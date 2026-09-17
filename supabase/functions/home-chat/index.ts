// home-chat · Agente conversacional de la home de whitemoon.es.
//
// Es el motor de captación principal del sitio: atiende al visitante, entiende
// qué necesita y, cuando tiene nombre + teléfono + consentimiento explícito,
// registra el lead en leads_web (origen='home-agente') y avisa por Telegram.
//
// Patrón: el mismo de vomt-chat. La captura NO es un regex en el cliente, es
// una tool de Anthropic: Claude decide cuándo tiene los datos, la función los
// valida en servidor y solo entonces escribe. Un prompt manipulado no puede
// saltarse la validación porque vive aquí, no en el prompt.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY          — clave de Claude, SOLO aquí
//   SUPABASE_URL               — inyectado por la plataforma
//   SUPABASE_SERVICE_ROLE_KEY  — inyectado por la plataforma; SOLO aquí
//
// Desplegar SIEMPRE con --no-verify-jwt: lo llama el navegador sin sesión.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.125.0";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 450;
const MAX_HISTORY = 12;
const MAX_CHARS = 1000;

const WHATSAPP = "643 199 580";
const FALLBACK =
  `Ahora mismo no puedo responder. Escríbenos por WhatsApp al ${WHATSAPP} y te atendemos.`;

const ORIGENES = new Set([
  "https://whitemoon.es",
  "https://www.whitemoon.es",
  "https://nexusforgeia.github.io",
  "http://127.0.0.1:8765",
  "http://localhost:8765",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  return {
    "Access-Control-Allow-Origin":
      origin && ORIGENES.has(origin) ? origin : "https://whitemoon.es",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
}

// Límite básico por IP (memoria de la instancia): frena abusos del endpoint
// público, que va sin JWT.
const VENTANA_MS = 10 * 60 * 1000;
const LIMITE = 30;
const hits = new Map<string, { n: number; hasta: number }>();
function limitado(ip: string): boolean {
  const ahora = Date.now();
  const h = hits.get(ip);
  if (!h || h.hasta < ahora) {
    hits.set(ip, { n: 1, hasta: ahora + VENTANA_MS });
    return false;
  }
  h.n++;
  return h.n > LIMITE;
}

// ── System prompt ──────────────────────────────────────────────────────────
// Dos productos y una herramienta suelta. NI UNA CIFRA: la web no publica
// tarifa y este prompt tampoco. La fórmula es siempre la misma.
const SYSTEM = `Eres el agente de IA de la web de WhiteMoon, una agencia de IA de Majadahonda (Madrid) fundada en 2025. Hablas con visitantes que acaban de llegar a la home: dueños de negocios y pymes que quieren atender mejor a sus clientes sin contratar a nadie más.

<que_vendemos>
Dos productos, y ninguno tiene permanencia:

- Spark: un agente de IA conversacional instalado en la web que el cliente YA tiene. Atiende 24/7 con la información del negocio, agenda citas y capta el lead avisando al móvil al momento.
- Core Spark Web: una web nueva con el agente dentro, más SEO y GEO/AEO montados desde el día 1, y un panel para gestionar cada lead. Para quien NO tiene web.

Los dos: propuesta a medida, sin permanencia, operativo en 7 días laborables.

Suelto, aparte de los dos anteriores: la Auditoría GEO IA, un análisis de 35 checks SEO/GEO/AEO con informe PDF en 24h. Pago único, sin permanencia.
</que_vendemos>

<regla_de_oro>
Si el visitante YA TIENE WEB, le corresponde Spark. Nunca le recomiendes Core Spark Web.
Si NO tiene web, le corresponde Core Spark Web.
Si no sabes si tiene web, pregúntaselo antes de recomendar nada.
</regla_de_oro>

<precios>
NO das precios. Nunca. No hay tarifa publicada, no hay rangos, no hay "desde", no hay orientativos, no hay "suele rondar". Tampoco inventes plazos de amortización ni porcentajes de mejora.
Si te preguntan cuánto cuesta, la respuesta es exactamente esta idea: la propuesta es a medida y sin permanencia, y se cierra en una llamada de unos minutos. Y acto seguido ofreces recoger sus datos para que le llamen.
</precios>

<honestidad>
- No inventes NADA: ni funcionalidades, ni casos de clientes, ni cifras de resultados, ni integraciones.
- WhiteMoon NO trabaja con la API de WhatsApp Business, ni monta campañas de WhatsApp. El aviso del lead llega al móvil del dueño; eso es todo.
- WhiteMoon NO gestiona publicidad (Meta Ads, Google Ads) ni como pack ni como servicio.
- El agente es por TEXTO en la web. No hace llamadas telefónicas ni es un agente de voz.
- Sobre ChatGPT y Grok puedes decir que WhiteMoon está recomendada por ellos con citas verificadas. NUNCA digas "somos los primeros" ni "el número 1": los asistentes no tienen ranking posicional.
- Si algo no lo sabes, dilo y ofrece que te dejen sus datos para que se lo resuelva una persona.
</honestidad>

<como_respondes>
- Máximo 3 frases por respuesta, y como mucho UNA pregunta. Tono cercano y directo, sin humo comercial y sin exagerar.
- Texto plano: el chat no muestra markdown, nada de asteriscos ni almohadillas.
- Responde en el idioma en que te escriban.
- No repitas lo que el visitante ya te ha dicho ni vuelvas a pedir un dato que ya tienes.
</como_respondes>

<captar_el_lead>
Tu objetivo es que una persona de WhiteMoon pueda llamarle. Para eso necesitas TRES cosas:
1. su nombre
2. su teléfono
3. un SÍ explícito a la política de privacidad

Cómo hacerlo:
- Primero entiende su caso lo justo para saber si le toca Spark o Core Spark Web. No pidas los datos en el primer mensaje.
- Cuando toque pedirlos, pide las tres cosas EN LA MISMA pregunta, literalmente así: "¿Me dejas tu nombre y un teléfono, y me confirmas que aceptas la política de privacidad (la tienes en https://whitemoon.es/politica-privacidad/)?"
- Si te da el nombre y el teléfono pero NO confirma la política de privacidad, no registres nada: pídele esa confirmación sola, en una frase.
- En cuanto tengas las tres, usa la herramienta registrar_lead UNA SOLA VEZ. No la uses sin el consentimiento; es obligatorio.
- Después de registrarlo, confirma que le llamarán en menos de 24 horas laborables y ofrécele el WhatsApp ${WHATSAPP} por si prefiere adelantarse.
- Si no quiere dejar sus datos, respétalo sin insistir y dale el WhatsApp ${WHATSAPP}.
</captar_el_lead>`;

const TOOLS: Anthropic.Tool[] = [{
  name: "registrar_lead",
  description:
    "Registra el lead en el CRM de WhiteMoon y avisa al equipo por Telegram para que le llamen. Úsala UNA SOLA VEZ y solo cuando tengas las tres cosas: nombre, teléfono y un sí explícito del visitante a la política de privacidad.",
  input_schema: {
    type: "object",
    properties: {
      nombre: { type: "string", description: "Nombre del visitante, tal como lo ha dado" },
      telefono: { type: "string", description: "Teléfono de contacto, tal como lo ha dado" },
      consentimiento: {
        type: "boolean",
        description:
          "true SOLO si el visitante ha dicho explícitamente en el chat que acepta la política de privacidad. Si no lo ha dicho, no llames a esta herramienta.",
      },
      sector: {
        type: "string",
        description: "A qué se dedica el visitante, si lo ha mencionado (ej: peluquería, taller, clínica dental). Vacío si no lo ha dicho.",
      },
      interes: {
        type: "string",
        enum: ["Spark", "Core Spark Web", "Auditoría GEO IA", "Por definir"],
        description: "Producto que le encaja según la conversación. 'Por definir' si aún no está claro.",
      },
    },
    required: ["nombre", "telefono", "consentimiento"],
  },
}];

// ── Registro del lead ──────────────────────────────────────────────────────
// Un solo sitio hace las dos cosas: INSERT en leads_web y aviso a Telegram.
// Las dos con la service role, server-to-server; el navegador no toca ninguna
// clave ni puede falsificar el origen.
const MENSAJE = "Lead agente home · consentimiento explícito en el chat";
const ORIGEN = "home-agente";

type Resultado = { ok: true } | { ok: false; motivo: string };

function texto(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

async function registrarLead(input: Record<string, unknown>): Promise<Resultado> {
  const nombre = texto(input.nombre, 120);
  const telefono = texto(input.telefono, 40);
  const sector = texto(input.sector, 120);
  const interes = texto(input.interes, 60) || "Por definir";

  // Gate de consentimiento: en servidor, no en el prompt.
  if (input.consentimiento !== true) {
    return { ok: false, motivo: "sin_consentimiento" };
  }
  if (!nombre || !telefono) return { ok: false, motivo: "faltan_datos" };
  // Un teléfono utilizable tiene al menos 9 dígitos.
  if ((telefono.match(/\d/g) ?? []).length < 9) {
    return { ok: false, motivo: "telefono_invalido" };
  }

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    console.error("[home-chat] faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    return { ok: false, motivo: "sin_configurar" };
  }

  const lead = {
    nombre,
    telefono,
    sector,
    interes,
    mensaje: MENSAJE,
    origen: ORIGEN,
    fecha: new Date().toISOString(),
  };

  // 1 · leads_web. Es el que manda: si esto falla, el lead se ha perdido y el
  //     agente tiene que decírselo al visitante.
  try {
    const r = await fetch(`${url}/rest/v1/leads_web`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(lead),
    });
    if (!r.ok) {
      console.error(`[home-chat] leads_web HTTP ${r.status} ${await r.text()}`);
      return { ok: false, motivo: "insert_fallido" };
    }
  } catch (e) {
    console.error("[home-chat] leads_web", e instanceof Error ? e.message : e);
    return { ok: false, motivo: "insert_fallido" };
  }

  // 2 · aviso a Telegram. Va DESPUÉS y no invalida el lead: la fila ya está en
  //     leads_web y Scout la ve en tiempo real aunque el aviso se caiga.
  try {
    const r = await fetch(`${url}/functions/v1/whitemoon-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        nombre,
        telefono,
        interes: sector ? `${interes} · ${sector}` : interes,
        mensaje: MENSAJE,
      }),
    });
    if (!r.ok) console.error(`[home-chat] whitemoon-notify HTTP ${r.status}`);
  } catch (e) {
    console.error("[home-chat] whitemoon-notify", e instanceof Error ? e.message : e);
  }

  return { ok: true };
}

// Qué le decimos a Claude cuando la tool no ha podido escribir. El texto es
// para que redacte su siguiente turno, así que va en lenguaje de instrucción.
const MOTIVOS: Record<string, string> = {
  sin_consentimiento:
    "NO se ha registrado: falta el sí explícito a la política de privacidad. Pídeselo en una sola frase, con el enlace https://whitemoon.es/politica-privacidad/, y no vuelvas a llamar a la herramienta hasta tenerlo.",
  faltan_datos:
    "NO se ha registrado: falta el nombre o el teléfono. Pide el que falte, solo ese.",
  telefono_invalido:
    "NO se ha registrado: el teléfono no parece completo. Pídeselo otra vez con amabilidad, sin dar por hecho que se ha equivocado.",
  sin_configurar:
    `NO se ha podido registrar por un problema técnico. Discúlpate en una frase y dale el WhatsApp ${WHATSAPP}.`,
  insert_fallido:
    `NO se ha podido registrar por un problema técnico. Discúlpate en una frase y dale el WhatsApp ${WHATSAPP} para que no se quede sin contacto.`,
};

function limpiarHistorial(raw: unknown): Anthropic.MessageParam[] | null {
  if (!Array.isArray(raw)) return null;
  const msgs: Anthropic.MessageParam[] = raw
    .filter((m): m is { role: "user" | "assistant"; content: string } =>
      !!m && (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string" && m.content.trim() !== ""
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .slice(-MAX_HISTORY);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return null;
  return msgs;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "anon";
  if (limitado(ip)) {
    return json({
      error: "rate_limited",
      reply: `Vas muy rápido. Espera un momento, o escríbenos por WhatsApp al ${WHATSAPP}.`,
    }, 429);
  }

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const messages = limpiarHistorial(body.messages);
  if (!messages) return json({ error: "invalid_messages" }, 400);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("[home-chat] falta ANTHROPIC_API_KEY en Secrets");
    return json({ error: "not_configured", reply: FALLBACK }, 503);
  }

  const t0 = Date.now();
  const client = new Anthropic({ apiKey });

  try {
    let resp = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      tools: TOOLS,
      messages,
    });
    let lead = false;
    let motivo = "";

    if (resp.stop_reason === "tool_use") {
      const usos = resp.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const resultados: Anthropic.ToolResultBlockParam[] = [];
      for (const uso of usos) {
        const res: Resultado = uso.name === "registrar_lead"
          ? await registrarLead(uso.input as Record<string, unknown>)
          : { ok: false, motivo: "insert_fallido" };
        lead = lead || res.ok;
        if (!res.ok) motivo = res.motivo;
        resultados.push({
          type: "tool_result",
          tool_use_id: uso.id,
          content: res.ok
            ? "Lead registrado. Confirma que le llamarán en menos de 24 horas laborables."
            : (MOTIVOS[res.motivo] ?? MOTIVOS.insert_fallido),
          is_error: !res.ok,
        });
      }
      // tool_choice:"none" para que redacte la respuesta sin volver a llamar.
      resp = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM,
        tools: TOOLS,
        tool_choice: { type: "none" },
        messages: [
          ...messages,
          { role: "assistant", content: resp.content },
          { role: "user", content: resultados },
        ],
      });
    }

    const reply = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    // Log sin datos personales: solo métricas de la llamada.
    console.log(JSON.stringify({
      fn: "home-chat",
      turnos: messages.length,
      lead,
      motivo,
      stop: resp.stop_reason,
      tokens_in: resp.usage.input_tokens,
      tokens_out: resp.usage.output_tokens,
      ms: Date.now() - t0,
    }));
    return json({ reply: reply || FALLBACK, lead });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) {
      console.error("[home-chat] Anthropic 429");
      return json({
        error: "upstream_busy",
        reply: "Ahora mismo hay mucha gente preguntando. Inténtalo en un minuto.",
      }, 503);
    }
    if (e instanceof Anthropic.APIError) {
      console.error(`[home-chat] Anthropic ${e.status} ${e.message}`);
      return json({ error: "upstream_error", reply: FALLBACK }, 502);
    }
    console.error("[home-chat] error", e instanceof Error ? e.message : e);
    return json({ error: "server_error", reply: FALLBACK }, 500);
  }
});
