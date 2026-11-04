-- Supabase Cron para las tareas programadas (architecture.md, "Tareas programadas"). NO está aplicada: se corre una
-- vez, a mano en el SQL Editor de Supabase, cuando la API esté desplegada (antes no hay a qué URL llamar). Vive aquí y
-- no en src/drizzle/ porque drizzle-kit la aplicaría sola con `db:migrate`.
--
-- Antes de correrla:
--   1. Database → Extensions: activar pg_cron y pg_net.
--   2. Guardar el secreto en Vault (mismo valor que JOB_SECRET de la API), una sola vez:
--        select vault.create_secret('<JOB_SECRET>', 'kairo_job_secret');
--   3. Cambiar <API_URL> por la dirección de la API desplegada (sin "/" al final).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Cada minuto: recordatorios que ya tocan.
select cron.schedule(
  'kairo-jobs-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := '<API_URL>/v1/internal/jobs/minute',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Job-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'kairo_job_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  );
  $$
);

-- Una vez al día, 12:00 UTC (6:00 en la Ciudad de México): papelera, cobros de membresías, avisos de presupuesto y
-- códigos de login vencidos.
select cron.schedule(
  'kairo-jobs-daily',
  '0 12 * * *',
  $$
  select net.http_post(
    url := '<API_URL>/v1/internal/jobs/daily',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Job-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'kairo_job_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);

-- Para quitarlas: select cron.unschedule('kairo-jobs-minute'); select cron.unschedule('kairo-jobs-daily');
