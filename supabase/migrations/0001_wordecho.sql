-- WordEcho account and cloud-sync schema.
-- Run with the Supabase CLI or paste into the SQL editor for a new project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  provider text not null default 'google' check (provider in ('google', 'apple', 'email')),
  subscription_status text not null default 'free'
    check (subscription_status in ('free', 'trialing', 'premium', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vault_categories (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  normalized_name text not null,
  color text not null,
  is_default boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  unique (user_id, normalized_name)
);

create table if not exists public.vault_words (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  word text not null check (length(trim(word)) > 0),
  normalized_word text not null,
  pronunciation text,
  definition text not null default '',
  definition_provider_name text,
  definition_provider_url text,
  definition_source_url text,
  definition_license_name text,
  definition_license_url text,
  simple_definition text,
  part_of_speech text,
  examples_json text not null default '[]',
  synonyms_json text not null default '[]',
  antonyms_json text not null default '[]',
  personal_notes text,
  source text,
  source_sentence text,
  category_id uuid references public.vault_categories(id) on delete set null,
  status text not null default 'learning'
    check (status in ('learning', 'familiar', 'mastered')),
  is_favorite boolean not null default false,
  next_review_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  deleted_at timestamptz,
  unique (user_id, normalized_word)
);

create table if not exists public.vault_reviews (
  id uuid primary key,
  word_id uuid not null references public.vault_words(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  response text not null check (response in ('know', 'not_sure', 'forgot')),
  reviewed_at timestamptz not null,
  scheduled_for timestamptz,
  next_review_at timestamptz,
  interval_days integer not null default 0 check (interval_days >= 0),
  ease_factor double precision not null default 2.5 check (ease_factor > 0),
  created_at timestamptz not null
);

create index if not exists vault_categories_user_updated_index
  on public.vault_categories(user_id, updated_at desc);
create index if not exists vault_words_user_updated_index
  on public.vault_words(user_id, updated_at desc);
create index if not exists vault_reviews_user_date_index
  on public.vault_reviews(user_id, reviewed_at desc);

alter table public.profiles enable row level security;
alter table public.vault_categories enable row level security;
alter table public.vault_words enable row level security;
alter table public.vault_reviews enable row level security;

create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "categories_select_own" on public.vault_categories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "categories_insert_own" on public.vault_categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "categories_update_own" on public.vault_categories
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "words_select_own" on public.vault_words
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "words_insert_own" on public.vault_words
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "words_update_own" on public.vault_words
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "reviews_select_own" on public.vault_reviews
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "reviews_insert_own" on public.vault_reviews
  for insert to authenticated with check ((select auth.uid()) = user_id);

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, email, display_name, avatar_url, provider) on public.profiles to authenticated;
grant update (email, display_name, avatar_url, updated_at) on public.profiles to authenticated;
grant select, insert, update on public.vault_categories to authenticated;
grant select, insert, update on public.vault_words to authenticated;
grant select, insert on public.vault_reviews to authenticated;

create or replace function public.sync_vault(p_snapshot jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_category_id uuid;
  v_word_id uuid;
  v_category_map jsonb := '{}'::jsonb;
  v_word_map jsonb := '{}'::jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if jsonb_typeof(coalesce(p_snapshot->'categories', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_snapshot->'words', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_snapshot->'reviews', '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid vault snapshot';
  end if;

  if pg_column_size(p_snapshot) > 10485760 then
    raise exception 'Vault snapshot is too large';
  end if;

  if jsonb_array_length(coalesce(p_snapshot->'categories', '[]'::jsonb)) > 500
     or jsonb_array_length(coalesce(p_snapshot->'words', '[]'::jsonb)) > 20000
     or jsonb_array_length(coalesce(p_snapshot->'reviews', '[]'::jsonb)) > 100000 then
    raise exception 'Vault snapshot is too large';
  end if;

  insert into public.profiles (id, email, display_name, avatar_url, provider)
  values (
    v_user_id,
    coalesce(auth.jwt()->>'email', ''),
    coalesce(auth.jwt()->'user_metadata'->>'full_name', auth.jwt()->'user_metadata'->>'name'),
    coalesce(auth.jwt()->'user_metadata'->>'avatar_url', auth.jwt()->'user_metadata'->>'picture'),
    'google'
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, profiles.display_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    updated_at = now();

  for v_item in
    select value from jsonb_array_elements(coalesce(p_snapshot->'categories', '[]'::jsonb))
  loop
    insert into public.vault_categories (
      id, user_id, name, normalized_name, color, is_default,
      created_at, updated_at, deleted_at
    ) values (
      (v_item->>'id')::uuid,
      v_user_id,
      v_item->>'name',
      v_item->>'normalized_name',
      v_item->>'color',
      coalesce((v_item->>'is_default')::boolean, false),
      (v_item->>'created_at')::timestamptz,
      (v_item->>'updated_at')::timestamptz,
      nullif(v_item->>'deleted_at', '')::timestamptz
    )
    on conflict (user_id, normalized_name) do update set
      name = case when excluded.updated_at >= vault_categories.updated_at then excluded.name else vault_categories.name end,
      color = case when excluded.updated_at >= vault_categories.updated_at then excluded.color else vault_categories.color end,
      is_default = case when excluded.updated_at >= vault_categories.updated_at then excluded.is_default else vault_categories.is_default end,
      updated_at = greatest(excluded.updated_at, vault_categories.updated_at),
      deleted_at = case when excluded.updated_at >= vault_categories.updated_at then excluded.deleted_at else vault_categories.deleted_at end;

    select id into v_category_id
    from public.vault_categories
    where user_id = v_user_id and normalized_name = v_item->>'normalized_name';

    v_category_map := v_category_map || jsonb_build_object(v_item->>'id', v_category_id::text);
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_snapshot->'words', '[]'::jsonb))
  loop
    v_category_id := null;
    if nullif(v_item->>'category_id', '') is not null then
      v_category_id := coalesce(
        nullif(v_category_map->>(v_item->>'category_id'), '')::uuid,
        nullif(v_item->>'category_id', '')::uuid
      );
    end if;

    insert into public.vault_words (
      id, user_id, word, normalized_word, pronunciation, definition,
      definition_provider_name, definition_provider_url, definition_source_url,
      definition_license_name, definition_license_url, simple_definition, part_of_speech,
      examples_json, synonyms_json, antonyms_json, personal_notes, source, source_sentence,
      category_id, status, is_favorite, next_review_at, revision,
      created_at, updated_at, deleted_at
    ) values (
      (v_item->>'id')::uuid, v_user_id, v_item->>'word', v_item->>'normalized_word',
      v_item->>'pronunciation', coalesce(v_item->>'definition', ''),
      v_item->>'definition_provider_name', v_item->>'definition_provider_url',
      v_item->>'definition_source_url', v_item->>'definition_license_name',
      v_item->>'definition_license_url', v_item->>'simple_definition',
      v_item->>'part_of_speech', coalesce(v_item->>'examples_json', '[]'),
      coalesce(v_item->>'synonyms_json', '[]'), coalesce(v_item->>'antonyms_json', '[]'),
      v_item->>'personal_notes', v_item->>'source', v_item->>'source_sentence',
      v_category_id, v_item->>'status', coalesce((v_item->>'is_favorite')::boolean, false),
      nullif(v_item->>'next_review_at', '')::timestamptz,
      greatest(coalesce((v_item->>'revision')::integer, 1), 1),
      (v_item->>'created_at')::timestamptz, (v_item->>'updated_at')::timestamptz,
      nullif(v_item->>'deleted_at', '')::timestamptz
    )
    on conflict (user_id, normalized_word) do update set
      word = case when excluded.updated_at >= vault_words.updated_at then excluded.word else vault_words.word end,
      pronunciation = case when excluded.updated_at >= vault_words.updated_at then excluded.pronunciation else vault_words.pronunciation end,
      definition = case when excluded.updated_at >= vault_words.updated_at then excluded.definition else vault_words.definition end,
      definition_provider_name = case when excluded.updated_at >= vault_words.updated_at then excluded.definition_provider_name else vault_words.definition_provider_name end,
      definition_provider_url = case when excluded.updated_at >= vault_words.updated_at then excluded.definition_provider_url else vault_words.definition_provider_url end,
      definition_source_url = case when excluded.updated_at >= vault_words.updated_at then excluded.definition_source_url else vault_words.definition_source_url end,
      definition_license_name = case when excluded.updated_at >= vault_words.updated_at then excluded.definition_license_name else vault_words.definition_license_name end,
      definition_license_url = case when excluded.updated_at >= vault_words.updated_at then excluded.definition_license_url else vault_words.definition_license_url end,
      simple_definition = case when excluded.updated_at >= vault_words.updated_at then excluded.simple_definition else vault_words.simple_definition end,
      part_of_speech = case when excluded.updated_at >= vault_words.updated_at then excluded.part_of_speech else vault_words.part_of_speech end,
      examples_json = case when excluded.updated_at >= vault_words.updated_at then excluded.examples_json else vault_words.examples_json end,
      synonyms_json = case when excluded.updated_at >= vault_words.updated_at then excluded.synonyms_json else vault_words.synonyms_json end,
      antonyms_json = case when excluded.updated_at >= vault_words.updated_at then excluded.antonyms_json else vault_words.antonyms_json end,
      personal_notes = case when excluded.updated_at >= vault_words.updated_at then excluded.personal_notes else vault_words.personal_notes end,
      source = case when excluded.updated_at >= vault_words.updated_at then excluded.source else vault_words.source end,
      source_sentence = case when excluded.updated_at >= vault_words.updated_at then excluded.source_sentence else vault_words.source_sentence end,
      category_id = case when excluded.updated_at >= vault_words.updated_at then excluded.category_id else vault_words.category_id end,
      status = case when excluded.updated_at >= vault_words.updated_at then excluded.status else vault_words.status end,
      is_favorite = case when excluded.updated_at >= vault_words.updated_at then excluded.is_favorite else vault_words.is_favorite end,
      next_review_at = case when excluded.updated_at >= vault_words.updated_at then excluded.next_review_at else vault_words.next_review_at end,
      revision = greatest(excluded.revision, vault_words.revision),
      updated_at = greatest(excluded.updated_at, vault_words.updated_at),
      deleted_at = case when excluded.updated_at >= vault_words.updated_at then excluded.deleted_at else vault_words.deleted_at end;

    select id into v_word_id
    from public.vault_words
    where user_id = v_user_id and normalized_word = v_item->>'normalized_word';

    v_word_map := v_word_map || jsonb_build_object(v_item->>'id', v_word_id::text);
  end loop;

  for v_item in
    select value from jsonb_array_elements(coalesce(p_snapshot->'reviews', '[]'::jsonb))
  loop
    v_word_id := coalesce(
      nullif(v_word_map->>(v_item->>'word_id'), '')::uuid,
      nullif(v_item->>'word_id', '')::uuid
    );

    insert into public.vault_reviews (
      id, word_id, user_id, response, reviewed_at, scheduled_for,
      next_review_at, interval_days, ease_factor, created_at
    ) values (
      (v_item->>'id')::uuid, v_word_id, v_user_id, v_item->>'response',
      (v_item->>'reviewed_at')::timestamptz,
      nullif(v_item->>'scheduled_for', '')::timestamptz,
      nullif(v_item->>'next_review_at', '')::timestamptz,
      greatest(coalesce((v_item->>'interval_days')::integer, 0), 0),
      greatest(coalesce((v_item->>'ease_factor')::double precision, 2.5), 0.1),
      (v_item->>'created_at')::timestamptz
    )
    on conflict (id) do nothing;
  end loop;

  return jsonb_build_object(
    'profile', (
      select jsonb_build_object(
        'id', id,
        'email', email,
        'display_name', display_name,
        'avatar_url', avatar_url,
        'subscription_status', subscription_status
      )
      from public.profiles where id = v_user_id
    ),
    'snapshot', jsonb_build_object(
      'categories', coalesce((
        select jsonb_agg(to_jsonb(category_row) order by category_row.id)
        from public.vault_categories category_row where category_row.user_id = v_user_id
      ), '[]'::jsonb),
      'words', coalesce((
        select jsonb_agg(to_jsonb(word_row) order by word_row.id)
        from public.vault_words word_row where word_row.user_id = v_user_id
      ), '[]'::jsonb),
      'reviews', coalesce((
        select jsonb_agg(to_jsonb(review_row) order by review_row.id)
        from public.vault_reviews review_row where review_row.user_id = v_user_id
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.sync_vault(jsonb) from public, anon;
grant execute on function public.sync_vault(jsonb) to authenticated;
