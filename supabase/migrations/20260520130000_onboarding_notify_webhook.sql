-- Database Webhook: al insertar en onboarding_clientes, llamar a la Edge
-- Function onboarding-notify de forma asíncrona (pg_net). Sustituye la llamada
-- que antes hacía el panel desde el navegador → ahora se dispara a nivel de BD
-- sin intervención manual, venga de donde venga el INSERT.

create extension if not exists pg_net;

create or replace function public.notify_onboarding_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := 'https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/onboarding-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYXF0bml1am52ZnhjdmNvdXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzUyMzIsImV4cCI6MjA5MzQxMTIzMn0.Neh7VUS8ADsxf0DPab0JoJyGXOAXnLIaXzXbKzj2BGs',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYXF0bml1am52ZnhjdmNvdXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzUyMzIsImV4cCI6MjA5MzQxMTIzMn0.Neh7VUS8ADsxf0DPab0JoJyGXOAXnLIaXzXbKzj2BGs'
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'onboarding_clientes',
      'schema', 'public',
      'record', to_jsonb(new)
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_onboarding_created on public.onboarding_clientes;
create trigger trg_notify_onboarding_created
  after insert on public.onboarding_clientes
  for each row execute function public.notify_onboarding_created();
