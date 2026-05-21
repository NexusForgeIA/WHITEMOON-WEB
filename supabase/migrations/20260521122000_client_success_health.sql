-- WhiteMoon — Módulo 3: client success automático
-- Función check_client_health(): semáforo de salud por cliente.
--   🔴 roja     → +3 días en el mismo step sin avanzar (onboarding atascado)
--   🟡 amarilla → onboarding completado hace +30 días sin upsell aceptado
--   🟢 verde    → cliente activo y avanzando correctamente
-- Depende de upsell_oportunidades (migración 20260521120000).

-- Marca de "revisado" para el botón "Marcar como revisado" del panel y para
-- que la Edge Function no reenvíe alertas de un cliente revisado hace poco.
alter table public.onboarding_clientes
  add column if not exists success_revisado_at timestamptz;

create or replace function public.check_client_health()
returns table (
  cliente_id     uuid,
  cliente_nombre text,
  sector         text,
  pack           text,
  estado         text,
  alerta         text,
  motivo         text,
  step_actual    text,
  dias_en_step   integer,
  dias_activo    integer,
  siguiente_pack text,
  revisado_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select
      c.id,
      c.cliente_nombre,
      c.sector,
      c.pack,
      c.estado,
      c.success_revisado_at,
      st.titulo as step_titulo,
      floor(extract(epoch from (now() - coalesce(c.dia_iniciado_at, c.fecha_inicio, c.created_at))) / 86400)::int as dias_step,
      case when c.fecha_completado is not null
           then floor(extract(epoch from (now() - c.fecha_completado)) / 86400)::int
           else null end as dias_act,
      (c.estado not in ('completado','pausado')
        and extract(epoch from (now() - coalesce(c.dia_iniciado_at, c.fecha_inicio, c.created_at))) / 86400 > 3) as es_roja,
      (c.estado = 'completado'
        and c.fecha_completado is not null
        and extract(epoch from (now() - c.fecha_completado)) / 86400 > 30
        and not exists (
          select 1 from public.upsell_oportunidades u
          where u.cliente_id = c.id and u.estado = 'aceptado'
        )) as es_amarilla
    from public.onboarding_clientes c
    left join lateral (
      select s.titulo from public.onboarding_steps s
      where s.onboarding_id = c.id and s.dia = greatest(coalesce(c.dia_actual, 0), 1)
      limit 1
    ) st on true
  )
  select
    id,
    cliente_nombre,
    sector,
    pack,
    estado,
    case when es_roja then 'roja' when es_amarilla then 'amarilla' else 'verde' end,
    case
      when es_roja     then 'Lleva +3 días en el step actual sin avanzar'
      when es_amarilla then 'Lleva +30 días activo sin upsell · oportunidad de upgrade'
      else 'Cliente activo y avanzando correctamente'
    end,
    coalesce(step_titulo, 'Día ' || greatest(0, dias_step)::text),
    case when estado not in ('completado','pausado') then dias_step else null end,
    dias_act,
    case pack when 'spark' then 'core' when 'core' then 'scale' when 'scale' then 'elite' else null end,
    success_revisado_at
  from base
  order by (case when es_roja then 0 when es_amarilla then 1 else 2 end), cliente_nombre;
$$;

grant execute on function public.check_client_health() to anon;
