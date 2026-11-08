-- Enable on the selected Supabase project only after deploying lgn-push.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create function lgn_private.dispatch_ghost_push(p_function_url text)
returns bigint language sql security invoker set search_path='' as $fn$
  select net.http_post(
    url:=p_function_url,
    headers:=jsonb_build_object('content-type','application/json','x-lgn-push-token',decrypted_secret),
    body:='{}'::jsonb,
    timeout_milliseconds:=30000
  )
  from vault.decrypted_secrets where name='lgn_push_dispatch_token';
$fn$;
revoke all on function lgn_private.dispatch_ghost_push(text) from public,anon,authenticated;

-- Deployment command, run with the selected project's public function URL:
-- select cron.schedule('lgn-push-dispatch','* * * * *',
--   $$select lgn_private.dispatch_ghost_push('https://<project-ref>.supabase.co/functions/v1/lgn-push')$$);
