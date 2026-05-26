-- WhiteMoon — Tabla de consumo de Orion (Custom LLM)
-- Registra cada turno de conversación que la edge function `orion-llm`
-- responde a Retell. Permite facturar consumo por cliente (token_cdn),
-- detectar picos de coste y auditar uso.
--
-- Pricing (Claude Haiku 4.5 — claude-haiku-4-5-20251001):
--   input  → 0.00000025 USD/token  (0,25 USD por millón)
--   output → 0.00000125 USD/token  (1,25 USD por millón)
-- El cálculo se hace en la edge function (Deno) y se guarda en coste_estimado_usd.

create table if not exists public.orion_usage (
  id                  uuid primary key default gen_random_uuid(),
  token_cdn           text not null,
  fecha               timestamptz not null default now(),
  input_tokens        integer not null default 0,
  output_tokens       integer not null default 0,
  coste_estimado_usd  numeric(12,8) not null default 0
);

-- Índices para queries habituales: por cliente y por orden temporal.
create index if not exists orion_usage_token_cdn_idx on public.orion_usage (token_cdn);
create index if not exists orion_usage_fecha_desc_idx on public.orion_usage (fecha desc);

-- ───────── RLS: SOLO service_role ─────────
-- Esta tabla guarda métricas internas. No debe ser accesible vía anon ni
-- authenticated. La edge function `orion-llm` usa SUPABASE_SERVICE_ROLE_KEY
-- para insertar; el panel admin (cuando lo haya) también usará service_role.

alter table public.orion_usage enable row level security;

drop policy if exists service_role_all_orion_usage on public.orion_usage;
create policy service_role_all_orion_usage on public.orion_usage
  for all to service_role
  using (true)
  with check (true);

-- Nota: NO se crea política para anon ni authenticated → acceso denegado por
-- defecto cuando RLS está habilitado y no hay política aplicable.
