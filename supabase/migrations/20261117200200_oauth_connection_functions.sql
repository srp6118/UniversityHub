alter table public.oauth_states
  add column instance_url text;

create function public.store_oauth_connection(
  p_user_id uuid,
  p_provider text,
  p_encrypted_payload text,
  p_scopes text[],
  p_expires_at timestamptz,
  p_account_label text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection_providers text[];
  v_connection_provider text;
begin
  v_connection_providers := case p_provider
    when 'google' then array['google_drive', 'google_calendar']
    when 'microsoft' then array['outlook_mail', 'outlook_calendar', 'onedrive', 'onenote']
    when 'canvas' then array['canvas']
    else null
  end;

  if v_connection_providers is null then
    raise exception 'Unsupported OAuth provider';
  end if;

  insert into public.oauth_tokens (user_id, provider, encrypted_payload, scopes, expires_at, updated_at)
  values (p_user_id, p_provider, p_encrypted_payload, coalesce(p_scopes, '{}'), p_expires_at, now())
  on conflict (user_id, provider) do update
  set encrypted_payload = excluded.encrypted_payload,
      scopes = excluded.scopes,
      expires_at = excluded.expires_at,
      updated_at = now();

  foreach v_connection_provider in array v_connection_providers loop
    insert into public.connections (user_id, provider, account_label, status, last_synced_at)
    values (p_user_id, v_connection_provider, p_account_label, 'connected', null)
    on conflict (user_id, provider) do update
    set account_label = excluded.account_label,
        status = 'connected',
        last_synced_at = null,
        updated_at = now();
  end loop;
end;
$$;

revoke all on function public.store_oauth_connection(uuid, text, text, text[], timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.store_oauth_connection(uuid, text, text, text[], timestamptz, text)
  to service_role;

create function public.disconnect_oauth_provider(
  p_user_id uuid,
  p_provider text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_connection_providers text[];
begin
  v_connection_providers := case p_provider
    when 'google' then array['google_drive', 'google_calendar']
    when 'microsoft' then array['outlook_mail', 'outlook_calendar', 'onedrive', 'onenote']
    when 'canvas' then array['canvas']
    else null
  end;

  if v_connection_providers is null then
    raise exception 'Unsupported OAuth provider';
  end if;

  delete from public.oauth_tokens
  where user_id = p_user_id and provider = p_provider;

  delete from public.connections
  where user_id = p_user_id and provider = any(v_connection_providers);
end;
$$;

revoke all on function public.disconnect_oauth_provider(uuid, text)
  from public, anon, authenticated;
grant execute on function public.disconnect_oauth_provider(uuid, text)
  to service_role;
