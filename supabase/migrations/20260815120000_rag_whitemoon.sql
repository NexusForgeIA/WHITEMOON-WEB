-- ════════════════════════════════════════════════════════════════
-- RAG de whitemoon.es — chatbot de texto del sitio (2º widget)
-- ----------------------------------------------------------------
-- Reutiliza la infraestructura Core RAG (pgvector, Voyage, el patrón
-- ingest/RPC/chat) pero con almacén PROPIO, y sin tocar ni una línea
-- de lo que usan los clientes: rag_documentos, rag_archivos,
-- buscar_rag, rag-ingest y rag-chat quedan exactamente como estaban.
--
-- POR QUÉ TABLA PROPIA Y NO rag_documentos:
--   `rag_documentos.embedding` es vector(1536) — dimensión de OpenAI
--   text-embedding-3-small. Los embeddings de Voyage voyage-3-lite son
--   de 512, y ningún modelo de Voyage produce 1536. Compartir la tabla
--   es literalmente imposible sin migrar la columna de los clientes,
--   que es justo lo que no queremos tocar.
--
--   (De hecho ese desajuste es la razón de que rag_documentos esté
--   vacía: rag-ingest intenta Voyage primero y el INSERT revienta con
--   "expected 1536 dimensions, not 512". Se deja como está: arreglarlo
--   es otro trabajo y toca infra de clientes.)
--
--   El efecto secundario es bueno: el aislamiento deja de depender de
--   un filtro por cliente_id. Son tablas distintas. Una consulta al
--   RAG del sitio no puede alcanzar datos de un cliente ni por error
--   de programación.
-- ════════════════════════════════════════════════════════════════

-- ── 1) Chunks del sitio ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wm_rag_chunks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url          text NOT NULL,               -- ruta del sitio: /precios/
  titulo       text,
  chunk_index  integer NOT NULL DEFAULT 0,
  contenido    text NOT NULL,
  embedding    vector(512) NOT NULL,        -- voyage-3-lite
  tokens       integer,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wm_rag_chunks_url_idx
  ON public.wm_rag_chunks (url);

CREATE INDEX IF NOT EXISTS wm_rag_chunks_embedding_idx
  ON public.wm_rag_chunks USING hnsw (embedding vector_cosine_ops);

-- ── 2) Control de re-ingesta ────────────────────────────────────
-- Hash del texto extraído de cada página. Sirve para dos cosas:
--   1. Re-ingesta barata tras un deploy: se pasa el sitio entero y
--      solo se re-embebe lo que cambió de verdad.
--   2. Cortar el abuso: wm-rag-ingest es alcanzable con la anon key
--      (que es pública), y sin esto cualquiera podría forzar
--      re-embeddings en bucle y quemar cuota de Voyage.
CREATE TABLE IF NOT EXISTS public.wm_rag_paginas (
  url           text PRIMARY KEY,
  hash          text NOT NULL,
  titulo        text,
  chunks        integer NOT NULL DEFAULT 0,
  caracteres    integer NOT NULL DEFAULT 0,
  indexado_at   timestamptz NOT NULL DEFAULT now()
);

-- RLS activa y SIN políticas, igual que rag_documentos: solo entra el
-- service_role de las Edge Functions. Desde el navegador, con la anon
-- key, estas tablas no existen.
ALTER TABLE public.wm_rag_chunks  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wm_rag_paginas ENABLE ROW LEVEL SECURITY;

-- ── 3) Búsqueda vectorial ───────────────────────────────────────
-- Sin parámetro de namespace: no hay nada que apuntar a otro sitio.
CREATE OR REPLACE FUNCTION public.buscar_rag_whitemoon(
  p_query_embedding vector,
  p_limit integer DEFAULT 6
)
RETURNS TABLE(id uuid, url text, titulo text, contenido text, similitud double precision)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    c.id,
    c.url,
    c.titulo,
    c.contenido,
    1 - (c.embedding <=> p_query_embedding) AS similitud
  FROM public.wm_rag_chunks c
  ORDER BY c.embedding <=> p_query_embedding
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 6), 1), 20);
$function$;

-- SECURITY DEFINER salta la RLS: que solo la invoquen las Edge
-- Functions, no PostgREST con la anon key.
REVOKE ALL ON FUNCTION public.buscar_rag_whitemoon(vector, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buscar_rag_whitemoon(vector, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_rag_whitemoon(vector, integer) TO service_role;

COMMENT ON TABLE public.wm_rag_chunks IS
  'Chunks + embeddings (voyage-3-lite, 512d) del contenido público de whitemoon.es. Almacén propio del chatbot del sitio; independiente del Core RAG de clientes.';
COMMENT ON TABLE public.wm_rag_paginas IS
  'Hash del texto de cada página indexada. Permite re-ingesta incremental y evita re-embeddings innecesarios.';
COMMENT ON FUNCTION public.buscar_rag_whitemoon(vector, integer) IS
  'Búsqueda vectorial sobre el contenido de whitemoon.es. No recibe namespace: opera sobre una tabla que los clientes no usan.';
