-- =====================================================================
-- Digital Design Explorer – module-level progress + teacher dashboard
-- ---------------------------------------------------------------------
-- Run ONCE: Supabase Dashboard > SQL Editor > New query > paste > Run.
--
-- BEFORE YOU RUN: in section 7 replace  CHANGE-THIS-PIN  with your own
-- teacher PIN (at least 8 characters). Students never see it.
--
-- What this script does
--   * keeps your existing STUDENTS table (id uuid) as the ONLY student identity
--   * adds a hashed password to STUDENTS so login works on any device
--   * makes the USN unique and checks its format (4GWxxECxxx)
--   * creates student_module_progress: ONE row per student + level + module
--   * creates student_quiz_attempts: every quiz attempt is kept
--   * removes the old "anyone may insert / update every row" policies
--   * keeps row level security ON everywhere; the website can only call
--     the functions in section 6, which check who is calling
--
-- It is safe to run again (it does not delete data). Your STUDENTS and
-- student_progress tables were empty when this script was written.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
-- 1) STUDENTS: login hash, unique USN, USN format
-- ---------------------------------------------------------------------
alter table public."STUDENTS" add column if not exists password_hash text;
alter table public."STUDENTS" add column if not exists created_at    timestamptz not null default now();
alter table public."STUDENTS" add column if not exists last_login    timestamptz;

create unique index if not exists students_usn_unique on public."STUDENTS" (upper(student_id));

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'students_usn_format') then
    alter table public."STUDENTS"
      add constraint students_usn_format check (student_id ~ '^4GW[0-9]{2}EC[0-9]{3}$');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2) Module-level progress: one row per student + level + module
--    A NULL in concepts/practice/quiz_completed means "this module has no
--    such item", so it does not count towards the percentage.
-- ---------------------------------------------------------------------
create table if not exists public.student_module_progress (
  id                    uuid primary key default gen_random_uuid(),
  student_id            uuid not null references public."STUDENTS"(id) on delete cascade,
  level                 integer not null check (level between 1 and 14),
  module                integer not null check (module between 1 and 40),
  concepts_completed    boolean,
  activities_completed  integer not null default 0 check (activities_completed >= 0),
  activities_total      integer not null default 0 check (activities_total >= 0),
  practice_completed    boolean,
  quiz_completed        boolean,
  quiz_score            integer,          -- best score (shown in the teacher table)
  quiz_total            integer,
  latest_score          integer,
  best_score            integer,
  attempt_count         integer not null default 0,
  progress_percent      integer not null default 0 check (progress_percent between 0 and 100),
  completed             boolean not null default false,
  details               jsonb not null default '{}'::jsonb,   -- e.g. which gates were explored
  started_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint student_module_progress_unique unique (student_id, level, module)
);
create index if not exists smp_level_module on public.student_module_progress (level, module);

-- Every quiz attempt is kept (nothing is overwritten)
create table if not exists public.student_quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public."STUDENTS"(id) on delete cascade,
  level       integer not null,
  module      integer not null,
  score       integer not null,
  total       integer not null,
  created_at  timestamptz not null default now()
);
create index if not exists sqa_student on public.student_quiz_attempts (student_id, level, module);

-- Login sessions (only a hash of each token is stored)
create table if not exists public.dde_sessions (
  token_hash  text primary key,
  student_id  uuid references public."STUDENTS"(id) on delete cascade,
  role        text not null check (role in ('student', 'teacher')),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null
);

create table if not exists public.dde_settings (
  k text primary key,
  v text not null
);

-- ---------------------------------------------------------------------
-- 3) Row level security: ON everywhere, no direct access for the browser
-- ---------------------------------------------------------------------
alter table public."STUDENTS"                enable row level security;
alter table public.student_progress          enable row level security;
alter table public.student_module_progress   enable row level security;
alter table public.student_quiz_attempts     enable row level security;
alter table public.dde_sessions              enable row level security;
alter table public.dde_settings              enable row level security;

-- The old policies let ANYONE insert students and change EVERY progress row
drop policy if exists allow_student_registration  on public."STUDENTS";
drop policy if exists allow_progress_registration on public.student_progress;
drop policy if exists allow_progress_update       on public.student_progress;

revoke all on table public."STUDENTS", public.student_progress, public.student_module_progress,
                    public.student_quiz_attempts, public.dde_sessions, public.dde_settings
  from anon, authenticated;

-- ---------------------------------------------------------------------
-- 4) Internal helpers (NOT callable from the website)
-- ---------------------------------------------------------------------
create or replace function public.dde_new_session(p_student uuid, p_role text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_token text := encode(gen_random_bytes(32), 'hex');
begin
  delete from public.dde_sessions where expires_at < now();
  insert into public.dde_sessions (token_hash, student_id, role, expires_at)
  values (encode(digest(v_token, 'sha256'), 'hex'), p_student, p_role,
          now() + case when p_role = 'teacher' then interval '12 hours' else interval '60 days' end);
  return v_token;
end $$;

create or replace function public.dde_session_student(p_token text)
returns uuid language sql stable security definer set search_path = public, extensions as $$
  select student_id from public.dde_sessions
   where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and role = 'student' and expires_at > now();
$$;

create or replace function public.dde_session_is_teacher(p_token text)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from public.dde_sessions
                  where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
                    and role = 'teacher' and expires_at > now());
$$;

-- Percentage = average of the items this module has (activities count as a fraction)
create or replace function public.dde_recompute(p_id uuid)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  m public.student_module_progress%rowtype;
  v_sum numeric := 0;
  v_n   integer := 0;
  v_pct integer;
begin
  select * into m from public.student_module_progress where id = p_id;
  if not found then return; end if;
  if m.activities_total > 0 then
    v_sum := v_sum + least(m.activities_completed, m.activities_total)::numeric / m.activities_total; v_n := v_n + 1;
  end if;
  if m.concepts_completed is not null then v_sum := v_sum + (case when m.concepts_completed then 1 else 0 end); v_n := v_n + 1; end if;
  if m.practice_completed is not null then v_sum := v_sum + (case when m.practice_completed then 1 else 0 end); v_n := v_n + 1; end if;
  if m.quiz_completed     is not null then v_sum := v_sum + (case when m.quiz_completed     then 1 else 0 end); v_n := v_n + 1; end if;
  v_pct := case when v_n = 0 then 0 else floor(100 * v_sum / v_n)::integer end;
  update public.student_module_progress
     set progress_percent = v_pct, completed = (v_pct >= 100), updated_at = now()
   where id = p_id;
end $$;

create or replace function public.dde_profile(p_student uuid)
returns json language sql stable security definer set search_path = public, extensions as $$
  select json_build_object('usn', s.student_id, 'name', s.student_name, 'email', s.email,
                           'branch', s.branch, 'semester', s.semester, 'section', s.section)
    from public."STUDENTS" s where s.id = p_student;
$$;

-- ---------------------------------------------------------------------
-- 5) Student functions
-- ---------------------------------------------------------------------
create or replace function public.dde_register(
  p_usn text, p_name text, p_email text, p_branch text, p_semester text, p_section text, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_usn text := upper(trim(coalesce(p_usn, '')));
  v_id  uuid;
begin
  if v_usn !~ '^4GW[0-9]{2}EC[0-9]{3}$' then return json_build_object('ok', false, 'error', 'invalid_usn'); end if;
  if length(trim(coalesce(p_name, ''))) = 0 then return json_build_object('ok', false, 'error', 'missing_name'); end if;
  if length(coalesce(p_password, '')) < 4 then return json_build_object('ok', false, 'error', 'weak_password'); end if;
  if exists (select 1 from public."STUDENTS" where upper(student_id) = v_usn) then
    return json_build_object('ok', false, 'error', 'already_registered');
  end if;
  insert into public."STUDENTS" (student_id, student_name, email, branch, semester, section, password_hash, last_login)
  values (v_usn, trim(p_name), lower(trim(coalesce(p_email, ''))), p_branch, p_semester, upper(trim(coalesce(p_section, ''))),
          crypt(p_password, gen_salt('bf')), now())
  returning id into v_id;
  return json_build_object('ok', true, 'token', public.dde_new_session(v_id, 'student'), 'student', public.dde_profile(v_id));
end $$;

create or replace function public.dde_login(p_usn text, p_email text, p_password text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_usn text := upper(trim(coalesce(p_usn, '')));
  s     public."STUDENTS"%rowtype;
begin
  select * into s from public."STUDENTS" where upper(student_id) = v_usn;
  if not found then return json_build_object('ok', false, 'error', 'not_registered'); end if;
  if s.password_hash is null
     or s.password_hash <> crypt(coalesce(p_password, ''), s.password_hash)
     or lower(trim(coalesce(s.email, ''))) <> lower(trim(coalesce(p_email, ''))) then
    perform pg_sleep(0.5);
    return json_build_object('ok', false, 'error', 'wrong_credentials');
  end if;
  update public."STUDENTS" set last_login = now() where id = s.id;
  return json_build_object('ok', true, 'token', public.dde_new_session(s.id, 'student'), 'student', public.dde_profile(s.id));
end $$;

create or replace function public.dde_logout(p_token text)
returns json language sql security definer set search_path = public, extensions as $$
  delete from public.dde_sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  select json_build_object('ok', true);
$$;

-- Save the non-quiz items of one module. Progress never goes backwards.
-- p_data: {"activities_completed":5,"activities_total":7,"concepts_completed":null,
--          "practice_completed":null,"has_quiz":false,"details":{...}}
create or replace function public.dde_save_module(p_token text, p_level integer, p_module integer, p_data jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_student uuid := public.dde_session_student(p_token);
  v_ac  integer := coalesce((p_data->>'activities_completed')::integer, 0);
  v_at  integer := coalesce((p_data->>'activities_total')::integer, 0);
  v_cc  boolean := (p_data->>'concepts_completed')::boolean;
  v_pc  boolean := (p_data->>'practice_completed')::boolean;
  v_hq  boolean := coalesce((p_data->>'has_quiz')::boolean, false);
  v_det jsonb   := coalesce(p_data->'details', '{}'::jsonb);
  v_id  uuid;
begin
  if v_student is null then return json_build_object('ok', false, 'error', 'not_logged_in'); end if;
  if p_level not between 1 and 14 or p_module not between 1 and 40
     or v_at < 0 or v_at > 500 or v_ac < 0 or v_ac > v_at then
    return json_build_object('ok', false, 'error', 'invalid_data');
  end if;
  insert into public.student_module_progress as m
    (student_id, level, module, concepts_completed, activities_completed, activities_total,
     practice_completed, quiz_completed, details)
  values (v_student, p_level, p_module, v_cc, v_ac, v_at, v_pc, case when v_hq then false end, v_det)
  on conflict (student_id, level, module) do update set
    activities_total     = greatest(m.activities_total, excluded.activities_total),
    activities_completed = greatest(m.activities_completed, excluded.activities_completed),
    concepts_completed   = case when excluded.concepts_completed is null then m.concepts_completed
                                else coalesce(m.concepts_completed, false) or excluded.concepts_completed end,
    practice_completed   = case when excluded.practice_completed is null then m.practice_completed
                                else coalesce(m.practice_completed, false) or excluded.practice_completed end,
    quiz_completed       = case when m.quiz_completed is null and v_hq then false else m.quiz_completed end,
    details              = case when excluded.activities_completed >= m.activities_completed then excluded.details else m.details end
  returning m.id into v_id;
  perform public.dde_recompute(v_id);
  return json_build_object('ok', true, 'progress',
    (select row_to_json(t) from (select level, module, progress_percent, completed, updated_at
                                   from public.student_module_progress where id = v_id) t));
end $$;

-- Record one quiz attempt (kept in student_quiz_attempts) and update the module
create or replace function public.dde_record_quiz(p_token text, p_level integer, p_module integer, p_score integer, p_total integer)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_student uuid := public.dde_session_student(p_token);
  v_id uuid;
begin
  if v_student is null then return json_build_object('ok', false, 'error', 'not_logged_in'); end if;
  if p_level not between 1 and 14 or p_module not between 1 and 40
     or p_total is null or p_total < 1 or p_total > 500 or p_score is null or p_score < 0 or p_score > p_total then
    return json_build_object('ok', false, 'error', 'invalid_data');
  end if;
  insert into public.student_quiz_attempts (student_id, level, module, score, total)
  values (v_student, p_level, p_module, p_score, p_total);
  insert into public.student_module_progress as m
    (student_id, level, module, quiz_completed, quiz_score, quiz_total, latest_score, best_score, attempt_count)
  values (v_student, p_level, p_module, true, p_score, p_total, p_score, p_score, 1)
  on conflict (student_id, level, module) do update set
    quiz_completed = true,
    quiz_total     = excluded.quiz_total,
    latest_score   = excluded.latest_score,
    best_score     = greatest(coalesce(m.best_score, 0), excluded.latest_score),
    quiz_score     = greatest(coalesce(m.best_score, 0), excluded.latest_score),
    attempt_count  = m.attempt_count + 1
  returning m.id into v_id;
  perform public.dde_recompute(v_id);
  return json_build_object('ok', true, 'progress',
    (select row_to_json(t) from (select level, module, progress_percent, completed, latest_score, best_score,
                                        attempt_count, quiz_total, updated_at
                                   from public.student_module_progress where id = v_id) t));
end $$;

-- A student's own progress (used to restore progress on a new device)
create or replace function public.dde_load_progress(p_token text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_student uuid := public.dde_session_student(p_token);
begin
  if v_student is null then return json_build_object('ok', false, 'error', 'not_logged_in'); end if;
  return json_build_object('ok', true, 'student', public.dde_profile(v_student), 'modules',
    (select coalesce(json_agg(row_to_json(t) order by t.level, t.module), '[]'::json)
       from (select level, module, concepts_completed, activities_completed, activities_total, practice_completed,
                    quiz_completed, quiz_score, quiz_total, latest_score, best_score, attempt_count,
                    progress_percent, completed, details, updated_at
               from public.student_module_progress where student_id = v_student) t));
end $$;

-- ---------------------------------------------------------------------
-- 6) Teacher functions (need a teacher session from dde_teacher_login)
-- ---------------------------------------------------------------------
create or replace function public.dde_teacher_login(p_pin text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  select v into h from public.dde_settings where k = 'teacher_pin_hash';
  if h is null or coalesce(p_pin, '') = 'CHANGE-THIS-PIN' or length(coalesce(p_pin, '')) < 8
     or h <> crypt(p_pin, h) then
    perform pg_sleep(1);
    return json_build_object('ok', false, 'error', 'wrong_pin');
  end if;
  return json_build_object('ok', true, 'token', public.dde_new_session(null, 'teacher'));
end $$;

-- All registered students for one level + module, including those with no progress row
create or replace function public.dde_teacher_report(p_token text, p_level integer, p_module integer)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.dde_session_is_teacher(p_token) then return json_build_object('ok', false, 'error', 'not_teacher'); end if;
  return json_build_object('ok', true, 'level', p_level, 'module', p_module, 'students',
    (select coalesce(json_agg(row_to_json(t) order by t.section, t.usn), '[]'::json)
       from (select s.student_id as usn, s.student_name as name, s.email, s.branch, s.semester, s.section,
                    s.last_login,
                    p.concepts_completed, p.activities_completed, p.activities_total, p.practice_completed,
                    p.quiz_completed, p.quiz_score, p.quiz_total, p.latest_score, p.best_score,
                    coalesce(p.attempt_count, 0) as attempt_count,
                    coalesce(p.progress_percent, 0) as progress_percent,
                    coalesce(p.completed, false) as completed,
                    p.details, p.started_at, p.updated_at,
                    (p.id is not null) as has_record
               from public."STUDENTS" s
               left join public.student_module_progress p
                      on p.student_id = s.id and p.level = p_level and p.module = p_module) t));
end $$;

-- One student's full record: profile, every module row, every quiz attempt
create or replace function public.dde_teacher_student(p_token text, p_usn text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid;
begin
  if not public.dde_session_is_teacher(p_token) then return json_build_object('ok', false, 'error', 'not_teacher'); end if;
  select id into v_id from public."STUDENTS" where upper(student_id) = upper(trim(coalesce(p_usn, '')));
  if v_id is null then return json_build_object('ok', false, 'error', 'no_student'); end if;
  return json_build_object('ok', true, 'student', public.dde_profile(v_id),
    'modules', (select coalesce(json_agg(row_to_json(t) order by t.level, t.module), '[]'::json)
                  from (select level, module, progress_percent, completed, activities_completed, activities_total,
                               concepts_completed, practice_completed, quiz_completed, latest_score, best_score,
                               quiz_total, attempt_count, updated_at
                          from public.student_module_progress where student_id = v_id) t),
    'attempts', (select coalesce(json_agg(row_to_json(t) order by t.created_at desc), '[]'::json)
                   from (select level, module, score, total, created_at
                           from public.student_quiz_attempts where student_id = v_id) t));
end $$;

-- ---------------------------------------------------------------------
-- 7) Teacher PIN (stored only as a hash). CHANGE THE TEXT BELOW, then run.
-- ---------------------------------------------------------------------
insert into public.dde_settings (k, v)
values ('teacher_pin_hash', extensions.crypt('060329', extensions.gen_salt('bf')))
on conflict (k) do update set v = excluded.v;

-- ---------------------------------------------------------------------
-- 8) The website (public key) may call ONLY these functions
-- ---------------------------------------------------------------------
revoke all on function public.dde_new_session(uuid, text)        from public, anon, authenticated;
revoke all on function public.dde_session_student(text)          from public, anon, authenticated;
revoke all on function public.dde_session_is_teacher(text)       from public, anon, authenticated;
revoke all on function public.dde_recompute(uuid)                from public, anon, authenticated;
revoke all on function public.dde_profile(uuid)                  from public, anon, authenticated;

revoke all on function public.dde_register(text, text, text, text, text, text, text) from public;
revoke all on function public.dde_login(text, text, text)                            from public;
revoke all on function public.dde_logout(text)                                       from public;
revoke all on function public.dde_save_module(text, integer, integer, jsonb)         from public;
revoke all on function public.dde_record_quiz(text, integer, integer, integer, integer) from public;
revoke all on function public.dde_load_progress(text)                                from public;
revoke all on function public.dde_teacher_login(text)                                from public;
revoke all on function public.dde_teacher_report(text, integer, integer)             from public;
revoke all on function public.dde_teacher_student(text, text)                        from public;

grant execute on function public.dde_register(text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.dde_login(text, text, text)                            to anon, authenticated;
grant execute on function public.dde_logout(text)                                       to anon, authenticated;
grant execute on function public.dde_save_module(text, integer, integer, jsonb)         to anon, authenticated;
grant execute on function public.dde_record_quiz(text, integer, integer, integer, integer) to anon, authenticated;
grant execute on function public.dde_load_progress(text)                                to anon, authenticated;
grant execute on function public.dde_teacher_login(text)                                to anon, authenticated;
grant execute on function public.dde_teacher_report(text, integer, integer)             to anon, authenticated;
grant execute on function public.dde_teacher_student(text, text)                        to anon, authenticated;

-- Useful later (read only):
--   Change the teacher PIN:
--     update public.dde_settings set v = extensions.crypt('NEW-PIN-HERE', extensions.gen_salt('bf')) where k = 'teacher_pin_hash';
--   Reset a student who forgot the password (they can then register again):
--     delete from public."STUDENTS" where student_id = '4GW24EC001';
