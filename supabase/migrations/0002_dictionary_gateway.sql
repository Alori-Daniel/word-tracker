-- WordEcho dictionary gateway storage and anonymous rate limiting.
-- Paste this entire file into the Supabase SQL Editor and run it once.

create table if not exists public.dictionary_lookup_cache (
  cache_key text primary key
    check (length(cache_key) between 4 and 200),
  payload jsonb not null
    check (jsonb_typeof(payload) = 'object'),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dictionary_lookup_cache_expiry_index
  on public.dictionary_lookup_cache(expires_at);

create table if not exists public.dictionary_lookup_rate_limits (
  identifier_hash text primary key
    check (identifier_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  request_count integer not null default 1
    check (request_count > 0),
  updated_at timestamptz not null default now()
);

create index if not exists dictionary_lookup_rate_limits_updated_index
  on public.dictionary_lookup_rate_limits(updated_at);

alter table public.dictionary_lookup_cache enable row level security;
alter table public.dictionary_lookup_rate_limits enable row level security;

-- The mobile app must never access these tables directly. Only the Edge
-- Function's server-side client can use them.
revoke all on public.dictionary_lookup_cache from public, anon, authenticated;
revoke all on public.dictionary_lookup_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.dictionary_lookup_cache to service_role;
grant select, insert, update, delete on public.dictionary_lookup_rate_limits to service_role;

create or replace function public.consume_dictionary_lookup_quota(
  p_identifier_hash text,
  p_limit integer default 30,
  p_window_seconds integer default 60
)
returns table (
  allowed boolean,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window_started_at timestamptz;
  v_request_count integer;
begin
  if p_identifier_hash is null
     or p_identifier_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid dictionary rate-limit identifier';
  end if;

  if p_limit < 1 or p_limit > 1000 then
    raise exception 'Dictionary rate limit must be between 1 and 1000';
  end if;

  if p_window_seconds < 10 or p_window_seconds > 86400 then
    raise exception 'Dictionary rate-limit window must be between 10 and 86400 seconds';
  end if;

  insert into public.dictionary_lookup_rate_limits as limits (
    identifier_hash,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    p_identifier_hash,
    v_now,
    1,
    v_now
  )
  on conflict (identifier_hash) do update set
    window_started_at = case
      when limits.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else limits.window_started_at
    end,
    request_count = case
      when limits.window_started_at
        <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else limits.request_count + 1
    end,
    updated_at = v_now
  returning
    window_started_at,
    request_count
  into v_window_started_at, v_request_count;

  allowed := v_request_count <= p_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(
      1,
      ceil(
        extract(
          epoch from (
            v_window_started_at
            + make_interval(secs => p_window_seconds)
            - v_now
          )
        )
      )::integer
    )
  end;

  return next;
end;
$$;

revoke all on function public.consume_dictionary_lookup_quota(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_dictionary_lookup_quota(text, integer, integer)
  to service_role;

comment on table public.dictionary_lookup_cache is
  'Server-only 24-hour cache for normalized dictionary responses.';
comment on table public.dictionary_lookup_rate_limits is
  'Server-only fixed-window counters keyed by salted client hashes.';
comment on function public.consume_dictionary_lookup_quota(text, integer, integer) is
  'Atomically consumes one anonymous dictionary lookup quota unit.';
