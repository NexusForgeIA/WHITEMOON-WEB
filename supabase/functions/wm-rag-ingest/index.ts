// ════════════════════════════════════════════════════════════════
// wm-rag-ingest · Edge Function (Supabase / Deno)
// ----------------------------------------------------------------
// Indexa páginas de whitemoon.es en wm_rag_chunks (almacén propio del
// sitio, independiente del Core RAG de clientes).
//
// MODELO *PULL*, no *push*. La función NO acepta texto: acepta una
// ruta, la valida contra el sitemap.xml real del sitio y descarga la
// página ella misma. Es deliberado:
//
//   `verify_jwt` NO sirve de protección aquí. Acepta cualquier JWT
//   válido del proyecto, y la anon key es pública (está a la vista en
//   assets/calc-lead.js y en la migración de cron). Si la función
//   aceptara texto libre, cualquiera podría inyectar contenido falso
//   que el chatbot público citaría después como si fuera del sitio.
//   Tirando del sitio en vivo, lo peor que puede hacer un tercero es
//   pedir que se reindexe una página que ya existe.
//
// Y para que ese "lo peor" tampoco cueste dinero, wm_rag_paginas
// guarda el hash del texto: si no cambió, no se re-embebe nada.
//
// Idempotente por URL: reindexar sustituye los chunks de esa URL.
//
// Body (JSON):
//   { url: "/precios/", force?: true }  -> indexa/reindexa esa página
//   { op: "sitemap" }                   -> rutas del sitemap en vivo
//   { op: "stats" }                     -> páginas y chunks indexados
//   { op: "prune" }                     -> borra lo que ya no está en el sitemap
// ════════════════════════════════════════════════════════════════
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Almacén propio del sitio: wm_rag_chunks / wm_rag_paginas. Ver la
// migración 20260815120000_rag_whitemoon.sql — no comparte tabla con el
// Core RAG de clientes (dimensiones de embedding incompatibles).
const SITIO = "https://whitemoon.es";

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SB_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });

// ── Sitemap: la lista blanca de rutas indexables ────────────────
// Se cachea por isolate para no pedirlo 290 veces durante una pasada
// completa.
let sitemapCache: { rutas: Set<string>; at: number } | null = null;

async function getSitemap(): Promise<Set<string>> {
  if (sitemapCache && Date.now() - sitemapCache.at < 10 * 60 * 1000) return sitemapCache.rutas;
  const resp = await fetch(`${SITIO}/sitemap.xml`, { headers: { "cache-control": "no-cache" } });
  if (!resp.ok) throw new Error(`No se pudo leer el sitemap (${resp.status})`);
  const xml = await resp.text();
  const rutas = new Set<string>();
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    try {
      const u = new URL(m[1]);
      if (u.hostname.endsWith("whitemoon.es")) rutas.add(u.pathname);
    } catch { /* loc inválido: se ignora */ }
  }
  if (!rutas.size) throw new Error("El sitemap no devolvió ninguna ruta");
  sitemapCache = { rutas, at: Date.now() };
  return rutas;
}

// ── Extracción de texto visible ─────────────────────────────────
const ENTIDADES: Record<string, string> = {
  "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&euro;": "€", "&hellip;": "…",
  "&mdash;": "—", "&ndash;": "–", "&laquo;": "«", "&raquo;": "»",
};

function decodeEntities(s: string): string {
  return s
    .replace(/&[a-z]+;|&#\d+;/gi, (e) => {
      const lit = ENTIDADES[e.toLowerCase()];
      if (lit) return lit;
      const num = e.match(/^&#(\d+);$/);
      return num ? String.fromCharCode(parseInt(num[1], 10)) : " ";
    });
}

function extraer(html: string): { titulo: string; descripcion: string; texto: string } {
  const titulo = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").trim())
    .replace(/\s+/g, " ");
  const descripcion = decodeEntities(
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ?? "",
  ).trim();

  // Fuera todo lo que no es prosa. El JSON-LD se va con <script>, que
  // es justo lo que queremos: ya está representado en el texto visible
  // y duplicarlo distorsiona la recuperación.
  let cuerpo = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ");

  // Preferimos <main>. Donde no lo hay (home, blog), quitamos nav y
  // footer: son idénticos en las 290 páginas y si se indexan compiten
  // con el contenido real en cada búsqueda.
  const main = cuerpo.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (main) {
    cuerpo = main[1];
  } else {
    const body = cuerpo.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (body) cuerpo = body[1];
    cuerpo = cuerpo
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ");
  }

  // Los bloques se separan con salto para que el chunking no pegue el
  // final de un titular con el principio del siguiente párrafo.
  const texto = decodeEntities(
    cuerpo
      .replace(/<\/(p|div|section|li|h[1-6]|tr|article|details|summary)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .split("\n").map((l) => l.trim()).filter(Boolean).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { titulo, descripcion, texto };
}

async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Mismos parámetros que rag-ingest (2000/200) para no divergir del
// comportamiento ya probado del Core RAG.
function chunkText(text: string, chunkSize = 2000, overlap = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end >= text.length) break;
    start += chunkSize - overlap;
  }
  return chunks.filter((c) => c.length > 50);
}

// Voyage acepta lotes: una llamada por página en vez de una por chunk.
async function embedBatch(textos: string[]): Promise<number[][]> {
  const voyageKey = Deno.env.get("VOYAGE_API_KEY") ?? "";
  if (!voyageKey) throw new Error("Falta VOYAGE_API_KEY");

  const out: number[][] = [];
  const LOTE = 64;
  for (let i = 0; i < textos.length; i += LOTE) {
    const slice = textos.slice(i, i + LOTE);
    let lastErr = "";
    let ok = false;
    // Voyage devuelve 429 con facilidad al ingestar en bucle; 3 intentos
    // con espera creciente evitan relanzar la pasada entera.
    for (let intento = 0; intento < 3 && !ok; intento++) {
      const resp = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${voyageKey}` },
        body: JSON.stringify({ model: "voyage-3-lite", input: slice, input_type: "document" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        for (const d of data.data) out.push(d.embedding);
        ok = true;
      } else {
        lastErr = `${resp.status} ${await resp.text()}`;
        await new Promise((r) => setTimeout(r, 1200 * (intento + 1)));
      }
    }
    if (!ok) throw new Error(`Voyage falló: ${lastErr}`);
  }
  return out;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const supabase = createClient(SB_URL, SB_SERVICE_KEY);

    // ── Operaciones de mantenimiento ──────────────────────────────
    if (body.op === "sitemap") {
      return json({ ok: true, op: "sitemap", rutas: [...await getSitemap()].sort() });
    }

    if (body.op === "stats") {
      const { count: chunks } = await supabase
        .from("wm_rag_chunks").select("*", { count: "exact", head: true });
      const { count: paginas } = await supabase
        .from("wm_rag_paginas").select("*", { count: "exact", head: true });
      return json({ ok: true, op: "stats", paginas, chunks });
    }

    // Limpia lo que ya no existe en el sitio. La lista viene del
    // sitemap en vivo, así que no hay input que manipular.
    if (body.op === "prune") {
      const vigentes = await getSitemap();
      const { data: indexadas } = await supabase.from("wm_rag_paginas").select("url");
      const sobran = (indexadas ?? []).map((r: { url: string }) => r.url).filter((u) => !vigentes.has(u));
      for (const url of sobran) {
        await supabase.from("wm_rag_chunks").delete().eq("url", url);
        await supabase.from("wm_rag_paginas").delete().eq("url", url);
      }
      return json({ ok: true, op: "prune", eliminadas: sobran });
    }

    // ── Ingesta de una página ─────────────────────────────────────
    const url = String(body.url ?? "").trim();
    if (!url) return json({ error: "Falta url" }, 400);

    // Lista blanca real: si no está en el sitemap, no se indexa. Corta
    // de raíz cualquier intento de apuntar la función a otro sitio.
    const rutas = await getSitemap();
    if (!rutas.has(url)) {
      return json({ error: "La ruta no está en el sitemap de whitemoon.es", url }, 400);
    }

    const pageResp = await fetch(`${SITIO}${url}`, { headers: { "cache-control": "no-cache" } });
    if (!pageResp.ok) return json({ error: `No se pudo descargar la página (${pageResp.status})`, url }, 502);

    const { titulo, descripcion, texto: cuerpo } = extraer(await pageResp.text());
    const texto = descripcion ? `${descripcion}\n\n${cuerpo}` : cuerpo;

    if (texto.length < 200) {
      return json({ error: "Texto insuficiente para indexar", url, caracteres: texto.length }, 422);
    }

    // Sin cambios respecto a lo indexado -> ni un embedding.
    const hash = await sha256(texto);
    const { data: previa } = await supabase
      .from("wm_rag_paginas").select("hash, chunks").eq("url", url).maybeSingle();
    if (previa && previa.hash === hash && !body.force) {
      return json({ ok: true, url, titulo, sin_cambios: true, chunks: previa.chunks });
    }

    const trozos = chunkText(texto);
    if (!trozos.length) return json({ error: "No se generó ningún chunk", url }, 422);

    // Cada chunk lleva su cabecera con título y URL: así el modelo ve
    // la fuente dentro del propio fragmento recuperado y puede citarla
    // aunque el trozo venga de la mitad de la página.
    const conCabecera = trozos.map(
      (c, i) => `[${titulo || url} — ${SITIO}${url}] (parte ${i + 1}/${trozos.length})\n${c}`,
    );

    // Los embeddings primero: si Voyage falla, la página se queda con
    // su versión anterior indexada en vez de desaparecer del RAG.
    const embeddings = await embedBatch(conCabecera);

    // Sustitución: fuera lo viejo de ESTA url, dentro lo nuevo.
    await supabase.from("wm_rag_chunks").delete().eq("url", url);

    const { error: insertError } = await supabase.from("wm_rag_chunks").insert(
      conCabecera.map((c, i) => ({
        url,
        titulo,
        chunk_index: i,
        contenido: c,
        embedding: JSON.stringify(embeddings[i]),
        tokens: Math.ceil(c.length / 4),
      })),
    );

    if (insertError) return json({ error: insertError.message, url }, 500);

    await supabase.from("wm_rag_paginas").upsert({
      url, hash, titulo, chunks: conCabecera.length, caracteres: texto.length,
      indexado_at: new Date().toISOString(),
    });

    return json({ ok: true, url, titulo, chunks: conCabecera.length, caracteres: texto.length });
  } catch (e) {
    return json({ error: String((e as Error).message) }, 500);
  }
});
