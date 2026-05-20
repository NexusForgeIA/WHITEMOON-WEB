-- WhiteMoon — Módulo 2: propuestas comerciales IA
create table if not exists public.propuestas (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  nombre_cliente      text,
  empresa             text,
  sector              text check (sector in (
                        'dental','legal','restaurante','gestoria','clinica',
                        'inmobiliaria','gimnasio','peluqueria','veterinaria',
                        'formacion','taller','podologia','automovil','abogados')),
  pack                text check (pack in ('spark','core','scale','elite')),
  url_web             text,
  dolor_principal     text,
  html_generado       text,
  estado              text not null default 'borrador' check (estado in (
                        'borrador','enviada','aceptada','rechazada')),
  notas               text,
  presupuesto_mensual integer
);

create index if not exists propuestas_estado_idx     on public.propuestas (estado);
create index if not exists propuestas_created_at_idx  on public.propuestas (created_at desc);

alter table public.propuestas enable row level security;

drop policy if exists anon_all_propuestas on public.propuestas;
create policy anon_all_propuestas on public.propuestas
  for all to anon using (true) with check (true);
