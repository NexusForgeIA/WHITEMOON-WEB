// ════════════════════════════════════════════════════════════════
// wm-rag-chat · Edge Function (Supabase / Deno)
// ----------------------------------------------------------------
// Chatbot de TEXTO con RAG de whitemoon.es. Segundo widget del sitio,
// convive con Orion (voz, Retell).
//
// verify_jwt: FALSE — se llama desde el navegador sin sesión, como el
// resto de endpoints públicos del sitio. No expone ningún secreto.
//
// AISLAMIENTO: este endpoint NO acepta `cliente_id`. Busca por
// `buscar_rag_whitemoon`, que consulta wm_rag_chunks — una tabla que
// el Core RAG de clientes no usa. No hay parámetro que manipular para
// alcanzar datos de un cliente. (Contraste deliberado con `rag-chat`,
// que sí recibe cliente_id del body y aquí no se toca.)
//
// Body (JSON): { pregunta: string, historial?: [{role, content}] }
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Solo los orígenes donde vive el widget. Evita que el endpoint (y la
// cuota de Claude) se use desde fuera del sitio.
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

// Por debajo de este parecido el fragmento es ruido: mejor que el bot
// diga que no lo sabe y derive, a que responda desde un chunk que no
// venía a cuento. Es la primera barrera contra inventar.
const UMBRAL_SIMILITUD = 0.35;

const SYSTEM_BASE = `Eres el asistente de texto de WhiteMoon Agencia IA (Majadahonda, Madrid). Respondes preguntas sobre WhiteMoon usando EXCLUSIVAMENTE el contenido real de whitemoon.es que se te entrega abajo.

## REGLA NÚMERO UNO — NO INVENTAR
- Responde SOLO con lo que aparezca en el CONTEXTO. Nada de conocimiento general sobre WhiteMoon, ni suposiciones, ni rellenar huecos.
- Precios, plazos, packs y características: SOLO si están literalmente en el contexto. Si te preguntan un precio que no aparece, NO lo estimes ni lo deduzcas de otro pack.
- Si la respuesta no está en el contexto: dilo con naturalidad ("eso no lo tengo aquí"), y ofrece que el equipo se lo confirme.
- Nunca cites cifras de resultados, porcentajes de mejora ni casos de clientes que no estén en el contexto.

## CITAR
- Cuando respondas con información del contexto, menciona de qué página sale, en lenguaje natural y con la ruta entre paréntesis. Ejemplo: "Lo tienes en la página de precios (/precios/)".
- Cada fragmento del contexto empieza por [Título — URL]: esa es la fuente que debes citar.
- Una o dos fuentes por respuesta, no más.

## TU PAPEL
- Resuelves dudas sobre WhiteMoon y, cuando el visitante quiere avanzar (pedir presupuesto, contratar, hablar con alguien) o cuando no tienes la respuesta, lo derivas al Departamento Comercial.
- Los datos se recogen en el botón "Que te llamen del Departamento Comercial" que hay justo debajo del chat. Invítale a pulsarlo: ahí deja su nombre y su teléfono.
- NO pidas el nombre ni el teléfono por chat. Este chat no guarda lo que se escribe en la conversación, así que un dato escrito aquí NO llega al equipo. Si el visitante te los escribe igualmente, agradéceselo y pídele que los ponga en ese botón para que lleguen a Comercial.
- Puedes preguntar, si viene a cuento, qué necesita o a qué se dedica: eso sí ayuda a orientar la respuesta.
- NO agendas citas. NO prometes una llamada a una hora concreta ni "te llamamos en X minutos". La fórmula correcta es: "déjalos ahí y el Departamento Comercial se pone en contacto contigo".
- No pides email, DNI, ni datos de pago.

## ESTILO
- Español de España, cercano y profesional. Tuteo.
- Máximo 3 frases por respuesta. Una sola pregunta por mensaje.
- Sin emojis. Sin markdown: texto plano.
- Si el visitante pregunta algo ajeno a WhiteMoon, redirige con amabilidad a lo que sí puedes ayudar.

## SI YA HA DEJADO SUS DATOS
Si el visitante dice que ya ha rellenado el formulario, confírmalo en una frase y sigue resolviendo dudas si las tiene. No insistas.`;

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = cors(origin);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const body = await req.json();
    const pregunta = String(body.pregunta ?? "").trim();

    if (!pregunta) return json({ error: "Falta pregunta" }, 400);
    if (pregunta.length > 1000) return json({ error: "Pregunta demasiado larga" }, 400);

    // ── 1) Embedding de la pregunta ───────────────────────────────
    const voyageKey = Deno.env.get("VOYAGE_API_KEY") ?? "";
    if (!voyageKey) return json({ error: "Falta VOYAGE_API_KEY" }, 500);

    const embResp = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${voyageKey}` },
      body: JSON.stringify({ model: "voyage-3-lite", input: [pregunta], input_type: "query" }),
    });
    if (!embResp.ok) {
      return json({ error: "Error generando embedding", detail: await embResp.text() }, 502);
    }
    const queryEmbedding = (await embResp.json()).data[0].embedding;

    // ── 2) Recuperación — namespace whitemoon, sin parámetros ─────
    const supabase = createClient(SB_URL, SB_SERVICE_KEY);
    const { data: chunks, error: searchError } = await supabase.rpc("buscar_rag_whitemoon", {
      p_query_embedding: JSON.stringify(queryEmbedding),
      p_limit: 6,
    });
    if (searchError) return json({ error: searchError.message }, 500);

    type Chunk = { url: string; titulo: string; contenido: string; similitud: number };
    const relevantes = ((chunks ?? []) as Chunk[]).filter((c) => c.similitud >= UMBRAL_SIMILITUD);

    const contexto = relevantes.length
      ? relevantes.map((c) => c.contenido).join("\n\n---\n\n")
      : "(No hay ningún fragmento del sitio que responda a esta pregunta.)";

    const systemConRAG =
      `${SYSTEM_BASE}\n\n## CONTEXTO — contenido real de whitemoon.es\n${contexto}\n\n` +
      (relevantes.length
        ? "Responde solo con lo anterior y cita la página."
        : "No hay contexto útil: NO respondas de memoria. Di que eso no lo tienes y ofrece que lo confirme el Departamento Comercial invitándole al botón de contacto.");

    // ── 3) Claude ─────────────────────────────────────────────────
    const historial = Array.isArray(body.historial) ? body.historial : [];
    const messages = historial
      .filter((m: { role?: string; content?: string }) =>
        (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()
      )
      .slice(-10)
      .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content.slice(0, 1000) }));
    messages.push({ role: "user", content: pregunta });

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        temperature: 0.2,
        system: systemConRAG,
        messages,
      }),
    });

    if (!resp.ok) {
      return json({ error: "Claude API error", detail: await resp.text() }, 502);
    }

    const data = await resp.json();
    const texto = data.content?.[0]?.text ?? "";

    // Fuentes únicas, por si el front quiere pintarlas como enlaces.
    const fuentes = [...new Set(relevantes.map((c) => c.url))].slice(0, 3);

    return json({
      ok: true,
      respuesta: texto,
      fuentes,
      chunks_usados: relevantes.length,
    });
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  }
});
