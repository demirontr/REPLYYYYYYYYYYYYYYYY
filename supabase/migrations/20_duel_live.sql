-- Duel + live tournament additions (owner: Claude 2).
-- Runs AFTER supabase/schema.sql (Claude 1). Only adds indexes, functions and realtime publication;
-- does not change or rename existing tables.
-- Assumes users.id is uuid. If schema.sql uses another type, change the uuid params below.

-- ---------- Indexes ----------
create index if not exists duels_opponent_status_idx on duels (opponent_id, status);
create index if not exists duels_challenger_status_idx on duels (challenger_id, status);
create index if not exists locations_updated_idx on locations (updated_at);
create unique index if not exists tournament_entries_pk on tournament_entries (tournament_id, user_id);

-- ---------- Nearby users (Haversine, metres) ----------
-- Only users who turned sharing on and pushed a position in the last 2 minutes.
create or replace function nearby_users(p_user uuid, p_radius_m double precision default 50)
returns table (user_id uuid, name text, elo int, xp int, distance_m double precision)
language sql stable as $$
  with me as (
    select lat, lng from locations where user_id = p_user and sharing
  )
  select u.id, u.name, u.elo, u.xp, d.distance_m
  from locations l
  join users u on u.id = l.user_id
  cross join me
  cross join lateral (
    select 2 * 6371000 * asin(least(1, sqrt(
      power(sin(radians(l.lat - me.lat) / 2), 2) +
      cos(radians(me.lat)) * cos(radians(l.lat)) * power(sin(radians(l.lng - me.lng) / 2), 2)
    ))) as distance_m
  ) d
  where l.user_id <> p_user
    and l.sharing
    and l.updated_at > now() - interval '2 minutes'
    and d.distance_m <= p_radius_m
  order by d.distance_m;
$$;

-- ---------- Expire unanswered invitations (60 s) ----------
create or replace function expire_stale_invites()
returns int language sql as $$
  with x as (
    update duels set status = 'expired'
    where status = 'invited' and created_at < now() - interval '60 seconds'
    returning 1
  )
  select count(*)::int from x;
$$;

-- ---------- Realtime ----------
do $$
declare t text;
begin
  foreach t in array array['duels', 'tournaments', 'tournament_entries', 'locations'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
