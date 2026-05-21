-- WhiteMoon — Módulo 6: casos de éxito + programa de referidos
-- Tablas: casos_exito + programa_referidos
-- Marca de tiempo testimonial_solicitado_at en onboarding_clientes para que la
-- Edge Function testimonial-request no repita el aviso de los 30 días.

-- ───────────────────────── casos_exito ─────────────────────────
create table if not exists public.casos_exito (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  cliente_nombre       text not null,
  sector               text,
  pack                 text check (pack in ('spark','core','scale','elite')),
  testimonio_texto     text,
  resultado_principal  text,
  resultado_secundario text,
  logo_url             text,
  autorizado           boolean not null default false,
  destacado            boolean not null default false,
  fecha_testimonio     timestamptz
);

create index if not exists casos_exito_destacado_idx  on public.casos_exito (destacado);
create index if not exists casos_exito_created_at_idx  on public.casos_exito (created_at desc);

alter table public.casos_exito enable row level security;
drop policy if exists anon_all_casos_exito on public.casos_exito;
create policy anon_all_casos_exito on public.casos_exito
  for all to anon using (true) with check (true);

-- ───────────────────────── programa_referidos ─────────────────────────
create table if not exists public.programa_referidos (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  cliente_referidor_id uuid references public.onboarding_clientes(id) on delete set null,
  nombre_referido      text not null,
  email_referido       text,
  telefono_referido    text,
  sector_referido      text,
  estado               text not null default 'pendiente' check (estado in (
                         'pendiente','contactado','convertido')),
  recompensa_aplicada  boolean not null default false
);

create index if not exists programa_referidos_referidor_idx on public.programa_referidos (cliente_referidor_id);
create index if not exists programa_referidos_estado_idx     on public.programa_referidos (estado);

alter table public.programa_referidos enable row level security;
drop policy if exists anon_all_programa_referidos on public.programa_referidos;
create policy anon_all_programa_referidos on public.programa_referidos
  for all to anon using (true) with check (true);

-- ───────── Marca de "testimonio solicitado" en el cliente ─────────
alter table public.onboarding_clientes
  add column if not exists testimonial_solicitado_at timestamptz;
