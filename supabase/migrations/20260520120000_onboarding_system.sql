-- WhiteMoon — Módulo de onboarding estandarizado (7 días)
-- Tablas: onboarding_clientes + onboarding_steps
-- Cada cliente nuevo se activa en 7 días exactos. Los 7 steps por defecto
-- se crean automáticamente al insertar un cliente (trigger).

-- ───────────────────────── onboarding_clientes ─────────────────────────
create table if not exists public.onboarding_clientes (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  cliente_nombre    text not null,
  cliente_email     text,
  cliente_telefono  text,
  sector            text check (sector in (
                      'dental','legal','restaurante','gestoria','clinica',
                      'inmobiliaria','gimnasio','peluqueria','veterinaria',
                      'formacion','taller','podologia','automovil','abogados')),
  pack              text check (pack in ('spark','core','scale','elite')),
  token_cdn         text,
  estado            text not null default 'pendiente' check (estado in (
                      'pendiente','dia1','dia2','dia3','dia4','dia5','dia6',
                      'completado','pausado')),
  dia_actual        int not null default 0,
  fecha_inicio      timestamptz,
  fecha_completado  timestamptz,
  notas             text,
  whatsapp_enviados int not null default 0,
  url_web_cliente   text,
  repo_github       text,
  -- Soporte para la alerta "+2 días en el mismo step": marca de tiempo del
  -- día actual, se actualiza en cada "Avanzar día".
  dia_iniciado_at   timestamptz
);

-- ───────────────────────── onboarding_steps ─────────────────────────
create table if not exists public.onboarding_steps (
  id            uuid primary key default gen_random_uuid(),
  onboarding_id uuid not null references public.onboarding_clientes(id) on delete cascade,
  dia           int not null check (dia between 1 and 7),
  titulo        text not null,
  descripcion   text,
  completado    boolean not null default false,
  completado_at timestamptz
);

create index if not exists onboarding_steps_onboarding_id_idx
  on public.onboarding_steps (onboarding_id);
create index if not exists onboarding_clientes_estado_idx
  on public.onboarding_clientes (estado);

-- ───────── Trigger: crear los 7 steps por defecto al alta del cliente ─────────
create or replace function public.create_default_onboarding_steps()
returns trigger
language plpgsql
as $$
begin
  insert into public.onboarding_steps (onboarding_id, dia, titulo, descripcion) values
    (new.id, 1, 'Acceso y configuración', 'Clonar repo demo sectorial, personalizar colores/logo/textos'),
    (new.id, 2, 'Edge Function',          'Configurar system prompt con datos reales del cliente'),
    (new.id, 3, 'Supabase cliente',       'Crear tabla leads, configurar RLS, conectar chatbot'),
    (new.id, 4, 'CDN token',              'Generar token WM-xxxxxxxx, activar license-check.js'),
    (new.id, 5, 'Testing',                'Probar 20 conversaciones, revisar flujo lead→WhatsApp'),
    (new.id, 6, 'Deploy',                 'Subir a dominio cliente, verificar SSL, GA4, sitemap'),
    (new.id, 7, 'Entrega',                'Demo en vivo con cliente, formación 30min, activar facturación');
  return new;
end;
$$;

drop trigger if exists trg_create_default_onboarding_steps on public.onboarding_clientes;
create trigger trg_create_default_onboarding_steps
  after insert on public.onboarding_clientes
  for each row execute function public.create_default_onboarding_steps();

-- ───────────────────────── RLS (patrón anon del sitio estático) ─────────────────────────
alter table public.onboarding_clientes enable row level security;
alter table public.onboarding_steps    enable row level security;

drop policy if exists anon_all_onboarding_clientes on public.onboarding_clientes;
create policy anon_all_onboarding_clientes on public.onboarding_clientes
  for all to anon using (true) with check (true);

drop policy if exists anon_all_onboarding_steps on public.onboarding_steps;
create policy anon_all_onboarding_steps on public.onboarding_steps
  for all to anon using (true) with check (true);
