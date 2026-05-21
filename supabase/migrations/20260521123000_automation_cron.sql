-- WhiteMoon — Cron diario (24h) para los módulos 3, 4 y 6.
-- Cada job invoca su Edge Function vía pg_net. Si pg_cron no está disponible en
-- el plan, la migración no falla (se captura el error) y los jobs se pueden
-- disparar manualmente desde cada panel o invocando la función directamente.
--
--   08:00 UTC  client-success-notify  (módulo 3 · alertas de churn)
--   08:15 UTC  upsell-trigger         (módulo 4 · oportunidades de upgrade)
--   08:30 UTC  testimonial-request    (módulo 6 · petición de testimonio a los 30d)

create extension if not exists pg_net;

do $$
declare
  base_url text := 'https://mlaqtniujnvfxcvcourm.supabase.co/functions/v1/';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1sYXF0bml1am52ZnhjdmNvdXJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4MzUyMzIsImV4cCI6MjA5MzQxMTIzMn0.Neh7VUS8ADsxf0DPab0JoJyGXOAXnLIaXzXbKzj2BGs';
  http_call text := $tpl$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','apikey',%L,'Authorization','Bearer '||%L),
      body := '{}'::jsonb,
      timeout_milliseconds := %s
    );
  $tpl$;
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron no disponible (%). Los jobs se dispararán manualmente.', sqlerrm;
    return;
  end;

  begin
    perform cron.schedule('wm-client-success-daily', '0 8 * * *',
      format(http_call, base_url || 'client-success-notify', anon_key, anon_key, 15000));
    perform cron.schedule('wm-upsell-trigger-daily', '15 8 * * *',
      format(http_call, base_url || 'upsell-trigger', anon_key, anon_key, 30000));
    perform cron.schedule('wm-testimonial-request-daily', '30 8 * * *',
      format(http_call, base_url || 'testimonial-request', anon_key, anon_key, 15000));
  exception when others then
    raise notice 'No se pudieron programar los cron jobs (%). Disparo manual disponible.', sqlerrm;
  end;
end $$;
