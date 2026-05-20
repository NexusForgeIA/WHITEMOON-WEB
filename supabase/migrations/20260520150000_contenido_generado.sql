-- WhiteMoon — Modulo 5: motor de contenido GEO/AEO
create table if not exists public.contenido_generado (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  tema              text,
  sector            text,
  tipo              text check (tipo in ('articulo','faq','caso-uso')),
  titulo            text,
  meta_title        text,
  meta_description  text,
  html_content      text,
  schema_jsonld     text,
  keywords_usadas   text,
  estado            text not null default 'borrador' check (estado in ('borrador','revisado','publicado')),
  url_publicada     text,
  fecha_publicacion timestamptz
);

create index if not exists contenido_generado_estado_idx     on public.contenido_generado (estado);
create index if not exists contenido_generado_created_at_idx  on public.contenido_generado (created_at desc);

alter table public.contenido_generado enable row level security;

drop policy if exists anon_all_contenido_generado on public.contenido_generado;
create policy anon_all_contenido_generado on public.contenido_generado
  for all to anon using (true) with check (true);
