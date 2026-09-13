import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/* =========================================================================
   recursos-diagnostico — Orion diagnosticando en /recursos/
   =========================================================================
   El bloque de /recursos/ tiene DOS caminos y este solo sirve a uno:

     · Los tres chips de sector son GUION. Los resuelve el navegador con
       texto escrito a mano. Ni tocan la red ni llegan aquí: son instantáneos,
       gratis y siempre correctos.
     · El texto libre —"tengo una floristería y…"— SÍ llega aquí.

   Orion NO CALCULA. Devuelve el diagnóstico y tres rangos en lenguaje
   natural ("2 o 3", "más de 10"); de convertir eso en un número al mes se
   encarga el navegador, igual que Hugo en logistica-chat. Un modelo que
   multiplica acaba enseñando una cifra falsa, y aquí la cifra es el
   argumento entero.

   Lo que el navegador hace con esos rangos, porque es la otra mitad del
   contrato: coge SIEMPRE el extremo bajo y lo rotula como cota ("al menos
   220 al mes"), nunca promedia los bordes ni suma nada. Así que las
   `opciones` pueden ser rangos abiertos o cerrados sin problema, pero cada
   una TIENE que llevar una cifra dentro: sin cifra no hay número que
   enseñar, y el paso 2 se lo salta antes que inventarlo.

   Contrato HTTP
   -------------
   POST  { mensaje: string }            (máx. 500 caracteres)
   200   { intro, si, no, pregunta, unidad, opciones: [a, b, c] }
   403   origen no autorizado
   400   mensaje ausente o demasiado largo

   El front NUNCA ve un error del modelo: si Anthropic falla, si la respuesta
   no es JSON o si le falta un campo, esta función devuelve el diagnóstico
   genérico con 200. Un 200 con contenido pobre es mejor que un bloque roto.

   Secrets (nunca en cliente):
     ANTHROPIC_API_KEY

   verify_jwt: false — la llama un navegador anónimo desde whitemoon.es.
     supabase functions deploy recursos-diagnostico --no-verify-jwt \
       --project-ref mlaqtniujnvfxcvcourm
   ========================================================================= */

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const MODELO = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 300;
const MAX_LEN = 500;

/* Es pública y gasta API en cada llamada: solo se atiende a whitemoon.es. */
const DOMINIO_AUTORIZADO = "whitemoon.es";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

/*
 * Misma normalización que verify-token v30: minúsculas, sin protocolo, sin
 * www y sin puerto. Se copia en lugar de reescribirse a propósito — dos
 * criterios distintos de "mismo dominio" en el mismo proyecto es una puerta
 * trasera esperando a que alguien la encuentre.
 */
function normalizeDomain(raw: string | null): string {
  if (!raw) return "";
  let d = raw.trim().toLowerCase();
  if (d.startsWith("http://") || d.startsWith("https://")) {
    try {
      d = new URL(d).hostname;
    } catch {
      return "";
    }
  }
  d = d.replace(/^www\./, "").replace(/:\d+$/, "");
  return d;
}

/* --------------------------------------------------------------- prompt */

const SYSTEM = `Eres Orion, el agente de WhiteMoon, en la página de recursos de whitemoon.es.
Tu trabajo aquí NO es vender: es diagnosticar.
Alguien te cuenta a qué se dedica y qué le quita tiempo. Respondes SIEMPRE con este JSON
y nada más:
{"intro":"...","si":"...","no":"...","pregunta":"...","unidad":"...","opciones":["...","...","..."]}

- intro: una frase que reconoce su situación con sus palabras.
- si: qué parte de eso se automatiza. Concreto, sin tecnicismos.
- no: qué parte NO se automatiza o no le compensa. OBLIGATORIO, nunca vacío, nunca "nada".
  Siempre hay algo que debe seguir haciendo una persona.
- pregunta: UNA sola pregunta para contar cuántas veces al día le pasa eso.
- unidad: cómo se llama lo que cuenta, en plural y minúscula ("llamadas sin coger",
  "mensajes repetidos", "citas perdidas").
- opciones: tres rangos de respuesta, de menor a mayor, en lenguaje natural.

REGLAS ABSOLUTAS
- Nunca des precios ni menciones packs. Si preguntan, remite a la página de precios.
- Nunca expliques CÓMO montarlo: ni herramientas, ni servicios, ni pasos técnicos.
  Diagnosticas el problema, no entregas la solución.
- Nunca prometas resultados, porcentajes ni cifras de mejora.
- Nunca inventes datos del negocio de quien escribe.
- Nunca calcules nada: de los números se encarga la web.
- Máximo 2 frases por campo.
- Español de España, tuteo, directo y sin humo.
- Si lo que cuentan no tiene nada que merezca automatizarse, dilo con honestidad en "si"
  y explica en "no" por qué no le compensa. Es preferible perder un lead que vender algo
  que no sirve.
- Si el mensaje no habla de un negocio, responde igualmente en JSON invitando a que cuente
  a qué se dedica.`;

/*
 * El diagnóstico genérico. Es el mismo texto que el navegador usa cuando esta
 * función no contesta, así que una caída no cambia lo que lee nadie: cambia
 * quién lo escribe.
 */
const GENERICO = {
  intro: "Con eso ya puedo orientarte, aunque te preguntaría un par de cosas más.",
  si: "Lo que se repite todos los días: responder lo de siempre, recoger datos y avisarte al momento.",
  no: "Lo que exige criterio tuyo o ver algo en persona. Eso no se delega, se te pasa antes.",
  pregunta: "¿Cuántas veces al día te interrumpe eso?",
  unidad: "interrupciones",
  opciones: ["2 o 3", "5 o 6", "más de 10"],
};

/* -------------------------------------------------------------- helpers */

type Diagnostico = typeof GENERICO;

/*
 * El modelo tiene prohibido envolver el JSON, pero a veces lo envuelve igual.
 * Se le quita la valla de markdown y, si aun así sobra texto, se recorta al
 * primer objeto de llave a llave.
 */
function extraeJson(bruto: string): unknown {
  let t = bruto.trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/, "").trim();
  }
  try {
    return JSON.parse(t);
  } catch { /* sigue abajo */ }

  const ini = t.indexOf("{");
  const fin = t.lastIndexOf("}");
  if (ini === -1 || fin <= ini) return null;
  try {
    return JSON.parse(t.slice(ini, fin + 1));
  } catch {
    return null;
  }
}

function frase(v: unknown, max = 300): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/*
 * Un diagnóstico solo vale si está COMPLETO. El campo que más se cae es "no"
 * —es el que el modelo tiende a dejar vacío o a rellenar con "nada"— y es
 * justamente el que sostiene el bloque: sin el "esto no" esto es publicidad.
 * Si falta cualquier pieza, devolvemos el genérico entero en vez de coser un
 * híbrido a medias.
 */
function valida(bruto: unknown): Diagnostico | null {
  if (!bruto || typeof bruto !== "object") return null;
  const d = bruto as Record<string, unknown>;

  const intro = frase(d.intro);
  const si = frase(d.si);
  const no = frase(d.no);
  const pregunta = frase(d.pregunta);
  const unidad = frase(d.unidad, 60).toLowerCase();

  if (!intro || !si || !pregunta || !unidad) return null;
  if (!no || /^(nada|ninguna|ninguno|n\/a|-)\.?$/i.test(no)) return null;

  const opciones = Array.isArray(d.opciones)
    ? d.opciones.map((o) => frase(o, 40)).filter(Boolean)
    : [];
  if (opciones.length !== 3) return null;

  /* Sin una cifra en cada rango el navegador no puede contar nada. */
  if (!opciones.every((o) => /\d/.test(o))) return null;

  return { intro, si, no, pregunta, unidad, opciones };
}

async function llamaAnthropic(mensaje: string): Promise<string | null> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODELO,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      /* Solo el último mensaje: aquí no hay conversación que mantener, hay un
         diagnóstico que dar. Sin historial no hay nada que envenenar entre
         turnos ni contexto que pagar. */
      messages: [{ role: "user", content: mensaje }],
    }),
  });

  if (!r.ok) {
    console.warn("[recursos-diagnostico] Anthropic", r.status, await r.text());
    return null;
  }

  const data = await r.json();
  if (!Array.isArray(data?.content)) return null;
  return data.content
    .filter((b: { type?: string }) => b?.type === "text")
    .map((b: { text?: string }) => String(b.text ?? ""))
    .join("\n")
    .trim();
}

/* ------------------------------------------------------------- servidor */

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  /* --- bloqueo por dominio --- */
  const origen = normalizeDomain(req.headers.get("origin")) ||
    normalizeDomain(req.headers.get("referer"));
  if (origen !== DOMINIO_AUTORIZADO) {
    console.warn("[recursos-diagnostico] origen rechazado:", origen || "(vacío)");
    return json({ error: "origen_no_autorizado" }, 403);
  }

  if (req.method !== "POST") {
    return json({ error: "metodo_no_permitido" }, 405);
  }

  const cuerpo = await req.json().catch(() => ({}));
  const mensaje = String((cuerpo as { mensaje?: unknown }).mensaje ?? "").trim();

  if (!mensaje) {
    return json({ error: "mensaje_requerido" }, 400);
  }
  if (mensaje.length > MAX_LEN) {
    return json({ error: "mensaje_demasiado_largo", max: MAX_LEN }, 400);
  }

  if (!ANTHROPIC_API_KEY) {
    console.warn("[recursos-diagnostico] falta ANTHROPIC_API_KEY");
    return json(GENERICO);
  }

  try {
    const texto = await llamaAnthropic(mensaje);
    if (!texto) return json(GENERICO);

    const diagnostico = valida(extraeJson(texto));
    if (!diagnostico) {
      console.warn("[recursos-diagnostico] respuesta inservible:", texto.slice(0, 300));
      return json(GENERICO);
    }

    return json(diagnostico);
  } catch (e) {
    console.warn("[recursos-diagnostico] error:", e);
    return json(GENERICO);
  }
});
