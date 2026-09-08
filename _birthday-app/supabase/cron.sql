create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
-- Create these two Vault secrets first through Integrations > Vault:
-- project_url = https://YOUR_PROJECT.supabase.co
-- birthday_cron_secret = same value as the CRON_SECRET Edge Function secret
select cron.schedule('birthday-every-minute','* * * * *', $$
 select net.http_post(
   url := (select decrypted_secret from vault.decrypted_secrets where name='project_url') || '/functions/v1/birthday-cron',
   headers := jsonb_build_object('Content-Type','application/json','x-cron-secret',(select decrypted_secret from vault.decrypted_secrets where name='birthday_cron_secret')),
   body := '{}'::jsonb, timeout_milliseconds := 120000
 );
$$);
