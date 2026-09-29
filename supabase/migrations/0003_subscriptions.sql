-- WordEcho subscription, billing-event, and CSV import allowance foundation.
-- Billing tables are server-owned. Mobile clients never write entitlement state.

create table if not exists public.billing_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  revenuecat_app_user_id text not null unique
    check (length(trim(revenuecat_app_user_id)) between 1 and 100),
  original_app_user_id text not null
    check (length(trim(original_app_user_id)) between 1 and 100),
  aliases text[] not null default '{}'::text[],
  entitlement_id text not null default 'premium'
    check (entitlement_id = 'premium'),
  lifecycle_status text not null default 'inactive'
    check (lifecycle_status in (
      'inactive', 'trialing', 'active', 'grace_period', 'billing_issue', 'expired'
    )),
  is_active boolean not null default false,
  product_id text,
  store text check (store is null or store in ('APP_STORE', 'PLAY_STORE')),
  environment text check (environment is null or environment in ('SANDBOX', 'PRODUCTION')),
  period_type text check (
    period_type is null or period_type in ('TRIAL', 'INTRO', 'NORMAL', 'PROMOTIONAL', 'PREPAID')
  ),
  purchased_at timestamptz,
  expires_at timestamptz,
  trial_ends_at timestamptz,
  grace_period_ends_at timestamptz,
  will_renew boolean not null default false,
  last_event_id text,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_customers_aliases_index
  on public.billing_customers using gin(aliases);
create index if not exists billing_customers_active_index
  on public.billing_customers(user_id, is_active, expires_at desc)
  where user_id is not null;

create table if not exists public.billing_webhook_events (
  event_id text primary key check (length(trim(event_id)) > 0),
  customer_id uuid references public.billing_customers(id) on delete set null,
  event_type text not null check (length(trim(event_type)) > 0),
  environment text check (environment is null or environment in ('SANDBOX', 'PRODUCTION')),
  occurred_at timestamptz not null,
  payload jsonb not null,
  processed_at timestamptz,
  processing_error text,
  received_at timestamptz not null default now()
);

create index if not exists billing_webhook_events_customer_index
  on public.billing_webhook_events(customer_id, occurred_at desc);
create index if not exists billing_webhook_events_unprocessed_index
  on public.billing_webhook_events(received_at)
  where processed_at is null;

create table if not exists public.feature_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature_key text not null check (feature_key in ('csv_import')),
  client_operation_id uuid not null,
  occurred_at timestamptz not null default now(),
  unique (user_id, feature_key, client_operation_id)
);

create index if not exists feature_usage_events_account_index
  on public.feature_usage_events(user_id, feature_key, occurred_at);

alter table public.billing_customers enable row level security;
alter table public.billing_webhook_events enable row level security;
alter table public.feature_usage_events enable row level security;

revoke all on public.billing_customers from public, anon, authenticated;
revoke all on public.billing_webhook_events from public, anon, authenticated;
revoke all on public.feature_usage_events from public, anon, authenticated;

create or replace function public.reserve_free_csv_import(p_operation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_subscription_status text;
  v_used integer;
  v_limit constant integer := 5;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_operation_id is null then
    raise exception 'Operation ID is required';
  end if;

  select subscription_status
  into v_subscription_status
  from public.profiles
  where id = v_user_id;

  if v_subscription_status is null then
    raise exception 'Account profile not found';
  end if;

  if v_subscription_status in ('trialing', 'premium') then
    return jsonb_build_object(
      'allowed', true,
      'limit', null,
      'remaining', null,
      'reason', 'premium'
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || ':csv_import', 0));

  select count(*)::integer
  into v_used
  from public.feature_usage_events
  where user_id = v_user_id and feature_key = 'csv_import';

  if exists (
    select 1
    from public.feature_usage_events
    where user_id = v_user_id
      and feature_key = 'csv_import'
      and client_operation_id = p_operation_id
  ) then
    return jsonb_build_object(
      'allowed', true,
      'limit', v_limit,
      'remaining', greatest(v_limit - v_used, 0),
      'reason', 'already_reserved'
    );
  end if;

  if v_used >= v_limit then
    return jsonb_build_object(
      'allowed', false,
      'limit', v_limit,
      'remaining', 0,
      'reason', 'limit_reached'
    );
  end if;

  insert into public.feature_usage_events (user_id, feature_key, client_operation_id)
  values (v_user_id, 'csv_import', p_operation_id);

  return jsonb_build_object(
    'allowed', true,
    'limit', v_limit,
    'remaining', v_limit - v_used - 1,
    'reason', 'free_allowance'
  );
end;
$$;

revoke all on function public.reserve_free_csv_import(uuid) from public, anon;
grant execute on function public.reserve_free_csv_import(uuid) to authenticated;
