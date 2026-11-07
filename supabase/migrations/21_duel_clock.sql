-- Duel timing on the database clock (owner: Claude 2). Run after 20_duel_live.sql.
--
-- Why: nearby_users() and expire_stale_invites() compare against the database's now(),
-- but locations.updated_at used to be written from the app server's clock. On a machine
-- whose clock is off by more than 2 minutes every position looked stale and nobody was "nearby".
-- These functions keep every duel timestamp and comparison on one clock: the database's.

-- Store my position with updated_at = now() (database time). Returns that timestamp.
create or replace function set_location(p_user int, p_lat double precision, p_lng double precision)
returns timestamptz language sql as $$
  insert into locations (user_id, lat, lng, sharing, updated_at)
  values (p_user, p_lat, p_lng, true, now())
  on conflict (user_id) do update
    set lat = excluded.lat, lng = excluded.lng, sharing = true, updated_at = now()
  returning updated_at;
$$;

-- The database clock, so the app can compute invite countdowns without trusting its own clock.
create or replace function db_now()
returns timestamptz language sql stable as $$
  select now();
$$;
