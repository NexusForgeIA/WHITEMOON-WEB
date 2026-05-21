-- WhiteMoon — Módulo 4: upsell automático
-- Tabla upsell_oportunidades + lógica de detección por pack actual.
-- Triggers de upsell (cliente con onboarding completado):
--   Spark → Core   : +60 días activo
--   Core  → Scale  : +90 días activo
--   Scale → Elite  : +120 días activo
-- La diferencia se mide desde fecha_completado (momento de activación).

-- ───────────────────────── upsell_oportunidades ─────────────────────────
create table if not exists public.upsell_oportunidades (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  cliente_id      uuid references public.onboarding_clientes(id) on delete cascade,
  pack_actual     text check (pack_actual in ('spark','core','scale','elite')),
  pack_propuesto  text check (pack_propuesto in ('spark','core','scale','elite')),
  precio_actual   integer,
  precio_nuevo    integer,
  diferencia_mrr  integer,
  estado          text not null default 'detectado' check (estado in (
                    'detectado','contactado','aceptado','rechazado')),
  fecha_contacto  timestamptz,
  notas           text
);

create index if not exists upsell_oportunidades_cliente_idx on public.upsell_oportunidades (cliente_id);
create index if not exists upsell_oportunidades_estado_idx  on public.upsell_oportunidades (estado);

alter table public.upsell_oportunidades enable row level security;

drop policy if exists anon_all_upsell_oportunidades on public.upsell_oportunidades;
create policy anon_all_upsell_oportunidades on public.upsell_oportunidades
  for all to anon using (true) with check (true);

-- ───────── Precio mensual recurrente por pack (regla CLAUDE.md) ─────────
-- Spark 199 · Core 199 · Scale 449 · Elite desde 599
create or replace function public.pack_precio_mensual(p text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(p, ''))
    when 'spark' then 199
    when 'core'  then 199
    when 'scale' then 449
    when 'elite' then 599
    else 0
  end;
$$;

-- ───────── Detección de oportunidades de upsell ─────────
-- Inserta una oportunidad 'detectado' por cada cliente que cruza el umbral de
-- días de su pack y NO tiene ya una oportunidad abierta hacia el siguiente pack.
-- Devuelve solo las filas recién creadas → la Edge Function las procesa
-- (Claude + WhatsApp) sin reenviar avisos de oportunidades antiguas.
create or replace function public.detect_upsell_opportunities()
returns setof public.upsell_oportunidades
language plpgsql
security definer
set search_path = public
as $$
declare
  rec      record;
  v_next   text;
  v_min    int;
  v_dias   int;
  v_pa     int;
  v_pn     int;
begin
  for rec in
    select * from public.onboarding_clientes
    where estado = 'completado'
      and pack in ('spark','core','scale')
      and fecha_completado is not null
  loop
    v_next := case rec.pack when 'spark' then 'core' when 'core' then 'scale' when 'scale' then 'elite' end;
    v_min  := case rec.pack when 'spark' then 60   when 'core' then 90     when 'scale' then 120 end;
    v_dias := floor(extract(epoch from (now() - rec.fecha_completado)) / 86400)::int;

    if v_dias < v_min then continue; end if;

    if exists (
      select 1 from public.upsell_oportunidades u
      where u.cliente_id = rec.id
        and u.pack_propuesto = v_next
        and u.estado in ('detectado','contactado','aceptado')
    ) then continue; end if;

    v_pa := public.pack_precio_mensual(rec.pack);
    v_pn := public.pack_precio_mensual(v_next);

    return query
      insert into public.upsell_oportunidades
        (cliente_id, pack_actual, pack_propuesto, precio_actual, precio_nuevo, diferencia_mrr, estado)
      values
        (rec.id, rec.pack, v_next, v_pa, v_pn, v_pn - v_pa, 'detectado')
      returning *;
  end loop;
end;
$$;

grant execute on function public.pack_precio_mensual(text)   to anon;
grant execute on function public.detect_upsell_opportunities() to anon;
