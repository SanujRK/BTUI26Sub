-- ============================================================
-- School Events Hub — schema, RLS, RPCs, and seed data
-- Run once in: Supabase Dashboard -> SQL Editor
-- ============================================================

-- ------------------- tables -------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  role text not null default 'student'
    check (role in ('student', 'parent', 'teacher', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  venue text not null default '',
  category text not null default 'General',
  capacity integer,
  image_url text,
  is_ticketed boolean not null default false,
  ticket_price numeric(10, 2) not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.events add column if not exists registrations_enabled boolean not null default true;
alter table public.events add column if not exists show_registration_count boolean not null default true;

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null default '',
  author text not null default 'Admin',
  event_id uuid references public.events(id) on delete set null,
  created_at timestamptz not null default now()
);

-- every announcement is an event, one per event
alter table public.announcements add constraint announcements_event_unique unique (event_id);

-- events and announcements are the same thing: mirror each event into the
-- announcements feed automatically
create or replace function public.sync_event_announcement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author text;
begin
  select coalesce(p.full_name, 'Admin') into v_author
  from public.profiles p
  where p.id = new.created_by;

  if tg_op = 'INSERT' then
    insert into public.announcements (title, body, author, event_id)
    values (new.title, new.description, coalesce(v_author, 'Admin'), new.id)
    on conflict (event_id) do update
      set title = excluded.title, body = excluded.body, author = excluded.author;
  elsif tg_op = 'UPDATE' then
    update public.announcements
      set title = new.title, body = new.description, author = coalesce(v_author, 'Admin')
    where event_id = new.id;
  elsif tg_op = 'DELETE' then
    delete from public.announcements where event_id = old.id;
  end if;

  return null;
end;
$$;

drop trigger if exists events_sync_announcement on public.events;
create trigger events_sync_announcement
  after insert or update or delete on public.events
  for each row execute procedure public.sync_event_announcement();

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.custom_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  color text not null default '#818cf8',
  starts_at timestamptz,
  event_id uuid references public.events(id) on delete set null,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.highlights (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null
);

-- ------------------- indexes -------------------

create index if not exists idx_events_starts on public.events (starts_at);
create index if not exists idx_registrations_event on public.registrations (event_id);
create index if not exists idx_registrations_user on public.registrations (user_id);
create index if not exists idx_tickets_event on public.tickets (event_id);
create index if not exists idx_tickets_user on public.tickets (user_id);
create index if not exists idx_custom_user on public.custom_events (user_id);
create index if not exists idx_highlights_event on public.highlights (event_id);

-- ------------------- helper functions -------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('teacher', 'admin')
  );
$$;

-- ------------------- signup trigger -------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
begin
  if v_role not in ('student', 'parent') then
    v_role := 'student';
  end if;
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_role
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------- row level security -------------------

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.announcements enable row level security;
alter table public.registrations enable row level security;
alter table public.tickets enable row level security;
alter table public.custom_events enable row level security;
alter table public.highlights enable row level security;
alter table public.site_settings enable row level security;

-- registrations and tickets are write-only through the RPCs below;
-- remove default insert rights so raw inserts are blocked by RLS anyway
revoke insert, update, delete on public.registrations from anon, authenticated;
revoke insert, update, delete on public.tickets from anon, authenticated;
revoke update, insert, delete on public.profiles from anon, authenticated;

-- profiles: everyone reads; owner edits their own display name only
create policy "profiles read" on public.profiles for select using (true);
create policy "profiles own update" on public.profiles
  for update using (auth.uid() = id);
grant update (full_name) on public.profiles to authenticated;

-- events: public read; staff write
create policy "events read" on public.events for select using (true);
create policy "events staff insert" on public.events
  for insert with check (public.is_staff());
create policy "events staff update" on public.events
  for update using (public.is_staff());
create policy "events staff delete" on public.events
  for delete using (public.is_staff());

-- announcements: public read; staff write
create policy "announcements read" on public.announcements for select using (true);
create policy "announcements staff insert" on public.announcements
  for insert with check (public.is_staff());
create policy "announcements staff update" on public.announcements
  for update using (public.is_staff());
create policy "announcements staff delete" on public.announcements
  for delete using (public.is_staff());

-- registrations: owner or staff read
create policy "registrations read" on public.registrations
  for select using (auth.uid() = user_id or public.is_staff());

-- tickets: owner or staff read
create policy "tickets read" on public.tickets
  for select using (auth.uid() = user_id or public.is_staff());

-- custom events: owner only
create policy "custom own select" on public.custom_events
  for select using (auth.uid() = user_id);
create policy "custom own insert" on public.custom_events
  for insert with check (auth.uid() = user_id);
create policy "custom own update" on public.custom_events
  for update using (auth.uid() = user_id);
create policy "custom own delete" on public.custom_events
  for delete using (auth.uid() = user_id);

-- highlights: public read; staff write
create policy "highlights read" on public.highlights for select using (true);
create policy "highlights staff insert" on public.highlights
  for insert with check (public.is_staff());

-- site settings: public read; admin write
create policy "settings read" on public.site_settings for select using (true);
create policy "settings admin insert" on public.site_settings
  for insert with check (public.is_admin());
create policy "settings admin update" on public.site_settings
  for update using (public.is_admin());
create policy "settings admin delete" on public.site_settings
  for delete using (public.is_admin());

-- ------------------- rpcs -------------------

create or replace function public.register_for_event(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_capacity integer;
  v_ticketed boolean;
  v_registrations boolean;
  v_count integer;
begin
  if v_user is null then
    return 'sign in to register';
  end if;

  select capacity, is_ticketed, registrations_enabled
  into v_capacity, v_ticketed, v_registrations
  from public.events where id = p_event_id for update;
  if not found then
    return 'event not found';
  end if;
  if v_ticketed then
    return 'this event needs a ticket';
  end if;
  if not v_registrations then
    return 'registrations closed';
  end if;

  if v_capacity is not null then
    select count(*) into v_count
    from public.registrations where event_id = p_event_id;
    if v_count >= v_capacity then
      return 'event is full';
    end if;
  end if;

  insert into public.registrations (event_id, user_id)
  values (p_event_id, v_user)
  on conflict (event_id, user_id) do nothing;

  if found then
    return 'registered';
  end if;
  return 'already registered';
end;
$$;

create or replace function public.buy_ticket(p_event_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_capacity integer;
  v_count integer;
begin
  if v_user is null then
    return 'sign in to buy';
  end if;

  perform 1 from public.events
  where id = p_event_id and is_ticketed
  for update;
  if not found then
    return 'event not found or not ticketed';
  end if;

  select capacity into v_capacity from public.events where id = p_event_id;

  if v_capacity is not null then
    select count(*) into v_count from public.tickets where event_id = p_event_id;
    if v_count >= v_capacity then
      return 'tickets sold out';
    end if;
  end if;

  insert into public.tickets (event_id, user_id)
  values (p_event_id, v_user)
  on conflict (event_id, user_id) do nothing;

  if found then
    return 'ticket bought';
  end if;
  return 'ticket already owned';
end;
$$;

create or replace function public.get_event_stats(p_event_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'capacity', e.capacity,
    'registrations', (select count(*) from public.registrations r where r.event_id = e.id),
    'tickets', (select count(*) from public.tickets t where t.event_id = e.id),
    'registrations_enabled', e.registrations_enabled,
    'show_registration_count', e.show_registration_count
  )
  from public.events e
  where e.id = p_event_id;
$$;

create or replace function public.get_public_events()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', e.id,
      'title', e.title,
      'description', e.description,
      'starts_at', e.starts_at,
      'ends_at', e.ends_at,
      'venue', e.venue,
      'category', e.category,
      'capacity', e.capacity,
      'image_url', e.image_url,
      'is_ticketed', e.is_ticketed,
      'ticket_price', e.ticket_price,
      'registrations', (select count(*) from public.registrations r where r.event_id = e.id),
      'tickets', (select count(*) from public.tickets t where t.event_id = e.id),
      'registrations_enabled', e.registrations_enabled,
      'show_registration_count', e.show_registration_count,
      'created_at', e.created_at
    )
    order by e.starts_at nulls last, e.created_at
  ), '[]'::jsonb)
  from public.events e;
$$;

create or replace function public.get_public_event(p_event_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', e.id,
    'title', e.title,
    'description', e.description,
    'starts_at', e.starts_at,
    'ends_at', e.ends_at,
    'venue', e.venue,
    'category', e.category,
    'capacity', e.capacity,
    'image_url', e.image_url,
    'is_ticketed', e.is_ticketed,
    'ticket_price', e.ticket_price,
    'registrations', (select count(*) from public.registrations r where r.event_id = e.id),
    'tickets', (select count(*) from public.tickets t where t.event_id = e.id),
    'registrations_enabled', e.registrations_enabled,
    'show_registration_count', e.show_registration_count,
    'created_at', e.created_at
  )
  from public.events e
  where e.id = p_event_id;
$$;

create or replace function public.set_user_role(p_user uuid, p_role text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return 'not allowed';
  end if;
  if p_role not in ('student', 'parent', 'teacher', 'admin') then
    return 'invalid role';
  end if;
  update public.profiles set role = p_role where id = p_user;
  if found then
    return 'role updated';
  end if;
  return 'user not found';
end;
$$;

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$;

grant execute on function public.delete_account() to authenticated;

-- ------------------- realtime -------------------

alter publication supabase_realtime add table public.highlights;

-- ------------------- seed data -------------------

insert into public.events (
  title, description, starts_at, ends_at, venue, category, capacity
) values
  ('Annual Debate Championship',
   'Inter-house debate finals. Three motions, three judges, one champion house. Teams of three from each house.',
   now() + interval '14 days', now() + interval '14 days' + interval '3 hours',
   'Main Auditorium', 'Debate', 240),
  ('Spring Athletics Meet',
   'Track and field events across two days. Long jump, sprints, relays, and shot put.',
   now() + interval '30 days', now() + interval '32 days',
   'School Grounds', 'Sports', 500),
  ('Science Exhibition 2026',
   'Student projects across robotics, chemistry, and sustainable energy. Judges award best-in-show per department.',
   now() + interval '21 days', now() + interval '21 days' + interval '6 hours',
   'Physics Lab Block', 'Exhibition', 200),
  ('Literary Fest',
   'Poetry slam, storytelling circles, and a creative writing workshop led by a published author.',
   now() + interval '7 days', now() + interval '7 days' + interval '4 hours',
   'Library Annex', 'Culture', 120),
  ('Inter-House Football Cup',
   'Round-robin league across the four houses, finishing with a knockout final on the last day.',
   now() + interval '45 days', now() + interval '47 days',
   'Football Ground', 'Sports', null),
  ('Robotics Workshop',
   'Hands-on session building line-following bots with school kits. Open to grades 9-12.',
   now() + interval '9 days', now() + interval '9 days' + interval '5 hours',
   'Innovation Lab', 'Tech', 40),
  ('Annual Day & Cultural Night',
   'The flagship evening: plays, dance, choir, and the awards ceremony. Parents invited.',
   now() + interval '60 days', now() + interval '60 days' + interval '6 hours',
   'Open-Air Stage', 'Culture', 1000),
  ('Spring Gala',
   'An evening of music and performances. Proceeds go to the library fund. Reserved seating.',
   now() + interval '26 days', now() + interval '26 days' + interval '4 hours',
   'Great Hall', 'Culture', 200)
on conflict do nothing;

insert into public.events (
  title, description, starts_at, ends_at, venue, category, capacity, is_ticketed, ticket_price
) values
  ('Alumni Meet 2026',
   'Reconnect with alumni over refreshments and a short program in the quad.',
   now() + interval '34 days', now() + interval '34 days' + interval '3 hours',
   'School Quad', 'General', 300, true, 10.00)
on conflict do nothing;

insert into public.events (
  title, description, starts_at, ends_at, venue, category, capacity
) values
  ('Music Night Auditions',
   'Open auditions for solo and group acts. Date to be announced.',
   null, null, 'Music Room', 'Culture', 150),
  ('Photography Walk',
   'A guided walk through the heritage quarter. Date to be announced.',
   null, null, 'Heritage Quarter', 'Exhibition', 60)
on conflict do nothing;

insert into public.announcements (title, body, author) values
  ('Event command center is live',
   'All events for the year are now on the calendar. Set reminders, register online, and follow live updates as they happen.',
   'Admin'),
  ('Registration is open for the Spring Athletics Meet',
   'Sign up early — spots are limited per event. Deadline is two days before the meet.',
   'Admin'),
  ('New: live updates on event pages',
   'Stay tuned to any event page for real-time highlights posted by the organizing team.',
   'Admin')
on conflict do nothing;

insert into public.site_settings (key, value) values
  ('theme', 'dark')
on conflict do nothing;