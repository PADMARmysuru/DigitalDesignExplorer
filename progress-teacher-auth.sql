-- =====================================================================
-- Digital Design Explorer – teacher accounts (email + password)
-- ---------------------------------------------------------------------
-- Run ONCE, after progress-setup.sql:
--   Supabase Dashboard > SQL Editor > New query > paste > Run.
--
-- BEFORE YOU RUN: in section 5 put YOUR email, name and a password
-- (at least 8 characters). You can add more teachers later the same way.
--
-- What this does
--   * creates dde_teachers – teacher accounts, separate from STUDENTS
--     (a student account can never become a teacher account)
--   * stores only a bcrypt hash of each teacher password
--   * replaces the shared teacher PIN with email + password login
--   * ends all old PIN sessions
--   * keeps row level security ON; the browser still has no table access
-- Student data, student logins and progress are not touched.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- 1) Teacher accounts
create table if not exists public.dde_teachers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  name          text,
  password_hash text not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  last_login    timestamptz
);
create unique index if not exists dde_teachers_email_unique on public.dde_teachers (lower(email));
alter table public.dde_teachers enable row level security;
revoke all on table public.dde_teachers from anon, authenticated;

-- 2) Teacher sessions belong to a teacher account
alter table public.dde_sessions add column if not exists teacher_id uuid references public.dde_teachers(id) on delete cascade;
delete from public.dde_sessions where role = 'teacher';          -- old PIN sessions end now

-- 3) Remove the PIN login
drop function if exists public.dde_teacher_login(text);
delete from public.dde_settings where k = 'teacher_pin_hash';

-- A teacher session is valid only for an ACTIVE teacher account
create or replace function public.dde_session_is_teacher(p_token text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1
                   from public.dde_sessions s
                   join public.dde_teachers t on t.id = s.teacher_id and t.active
                  where s.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
                    and s.role = 'teacher' and s.expires_at > now());
$$;

-- 4) Functions for the website
create or replace function public.dde_teacher_login(p_email text, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  t       public.dde_teachers%rowtype;
  v_token text;
begin
  select * into t from public.dde_teachers where lower(email) = lower(trim(coalesce(p_email, ''))) and active;
  if not found or t.password_hash <> crypt(coalesce(p_password, ''), t.password_hash) then
    perform pg_sleep(1);                                   -- slows down password guessing
    return json_build_object('ok', false, 'error', 'wrong_credentials');
  end if;
  delete from public.dde_sessions where expires_at < now();
  v_token := encode(gen_random_bytes(32), 'hex');
  insert into public.dde_sessions (token_hash, student_id, teacher_id, role, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), null, t.id, 'teacher', now() + interval '12 hours');
  update public.dde_teachers set last_login = now() where id = t.id;
  return json_build_object('ok', true, 'token', v_token, 'teacher', json_build_object('name', t.name, 'email', t.email));
end $$;

-- Who is logged in? (used by the dashboard to check the session on every visit)
create or replace function public.dde_teacher_me(p_token text)
returns json language plpgsql stable security definer set search_path = public, extensions as $$
declare r record;
begin
  select t.name, t.email into r
    from public.dde_sessions s join public.dde_teachers t on t.id = s.teacher_id and t.active
   where s.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and s.role = 'teacher' and s.expires_at > now();
  if not found then return json_build_object('ok', false, 'error', 'not_teacher'); end if;
  return json_build_object('ok', true, 'teacher', json_build_object('name', r.name, 'email', r.email));
end $$;

-- Admin only (run in the SQL Editor; the website can NOT call this)
create or replace function public.dde_admin_set_teacher(p_email text, p_name text, p_password text)
returns text language plpgsql security definer set search_path = public, extensions as $$
begin
  if length(coalesce(p_password, '')) < 8 then raise exception 'Teacher password must have at least 8 characters'; end if;
  if position('@' in coalesce(p_email, '')) = 0 then raise exception 'Please give a valid email address'; end if;
  insert into public.dde_teachers (email, name, password_hash)
  values (lower(trim(p_email)), p_name, crypt(p_password, gen_salt('bf')))
  on conflict ((lower(email))) do update set name = excluded.name, password_hash = excluded.password_hash, active = true;
  delete from public.dde_sessions s using public.dde_teachers t
   where s.teacher_id = t.id and lower(t.email) = lower(trim(p_email));   -- a new password ends old sessions
  return 'Teacher account ready: ' || lower(trim(p_email));
end $$;

revoke all on function public.dde_session_is_teacher(text)              from public, anon, authenticated;
revoke all on function public.dde_admin_set_teacher(text, text, text)   from public, anon, authenticated;
revoke all on function public.dde_teacher_login(text, text)             from public;
revoke all on function public.dde_teacher_me(text)                      from public;
grant execute on function public.dde_teacher_login(text, text) to anon, authenticated;
grant execute on function public.dde_teacher_me(text)          to anon, authenticated;

-- 5) YOUR teacher account – change the three values, then run the whole file
select public.dde_admin_set_teacher('padmar@gsss.edu.in', 'Mrs. Padma R', 'Sidiksha@2019');

notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------
-- Later (SQL Editor):
--   Add another teacher, or reset a teacher password:
--     select public.dde_admin_set_teacher('name@gsss.edu.in', 'Teacher Name', 'NewPassword123');
--   Remove a teacher's access:
--     update public.dde_teachers set active = false where lower(email) = 'name@gsss.edu.in';
--   List teachers (no passwords are stored in readable form):
--     select email, name, active, last_login from public.dde_teachers;
-- ---------------------------------------------------------------------
