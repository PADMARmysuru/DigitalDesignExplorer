-- =====================================================================
-- Digital Design Explorer: faculty-controlled level access + progress tracking
-- Run this ONCE in Supabase: Dashboard > SQL Editor > New query > paste > Run.
--
-- BEFORE YOU RUN: change 'CHANGE-THIS-PIN' in step 3 to a NEW, long faculty PIN.
-- Do NOT reuse the old PIN from index.html: that one is visible to students.
-- Your existing STUDENTS and student_progress tables are not touched.
-- =====================================================================

-- 1) Extension used to hash secrets on the server
create extension if not exists pgcrypto with schema extensions;

-- 2) Tables (row level security ON and no policies: nobody can read or write them directly;
--    the browser can only call the functions in step 4)
create table if not exists public.l4_students (
  usn        text primary key,
  name       text,
  email      text,
  branch     text,
  semester   text,
  section    text,
  key_hash   text not null,
  created_at timestamptz not null default now(),
  last_seen  timestamptz
);
create table if not exists public.l4_progress (
  usn        text primary key references public.l4_students(usn) on delete cascade,
  snapshot   jsonb not null default '{}'::jsonb,
  seconds    integer not null default 0,
  last_page  text,
  updated_at timestamptz not null default now()
);
create table if not exists public.l4_access (
  usn        text not null references public.l4_students(usn) on delete cascade,
  level      integer not null,
  granted_at timestamptz not null default now(),
  primary key (usn, level)
);
create table if not exists public.l4_section_access (
  section    text not null,
  level      integer not null,
  granted_at timestamptz not null default now(),
  primary key (section, level)
);
create table if not exists public.l4_settings (
  k text primary key,
  v text not null
);

alter table public.l4_students       enable row level security;
alter table public.l4_progress       enable row level security;
alter table public.l4_access         enable row level security;
alter table public.l4_section_access enable row level security;
alter table public.l4_settings       enable row level security;

revoke all on table public.l4_students, public.l4_progress, public.l4_access,
                    public.l4_section_access, public.l4_settings from anon, authenticated;

-- 3) Faculty PIN (stored only as a hash). CHANGE THE TEXT BELOW, then run.
insert into public.l4_settings (k, v)
values ('faculty_pin_hash', encode(extensions.digest('CHANGE-THIS-PIN', 'sha256'), 'hex'))
on conflict (k) do update set v = excluded.v;

-- 4) Functions the website calls (they run with the table owner's rights)

-- 4a) student registers on the server, or reconnects to an existing record with the same password
create or replace function public.l4_enroll(
  p_usn text, p_name text, p_email text, p_branch text, p_semester text, p_section text, p_key text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_usn  text := upper(trim(coalesce(p_usn, '')));
  v_hash text;
  v_row  public.l4_students%rowtype;
begin
  if v_usn = '' or p_key is null or length(p_key) < 20 then
    return json_build_object('status', 'invalid');
  end if;
  v_hash := encode(digest(p_key, 'sha256'), 'hex');
  select * into v_row from public.l4_students where usn = v_usn;
  if not found then
    insert into public.l4_students (usn, name, email, branch, semester, section, key_hash, last_seen)
    values (v_usn, p_name, p_email, p_branch, p_semester, trim(p_section), v_hash, now());
    return json_build_object('status', 'created');
  end if;
  if v_row.key_hash = v_hash then
    update public.l4_students
       set name = p_name, email = p_email, branch = p_branch, semester = p_semester,
           section = trim(p_section), last_seen = now()
     where usn = v_usn;
    return json_build_object('status', 'ok');
  end if;
  return json_build_object('status', 'wrong_key');
end $$;

-- 4b) may this student open level p_level? (levels 1 and 2 are not gated here)
create or replace function public.l4_check(p_usn text, p_key text, p_level integer)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_usn text := upper(trim(coalesce(p_usn, '')));
  s     public.l4_students%rowtype;
  v_ok  boolean;
begin
  select * into s from public.l4_students
   where usn = v_usn and key_hash = encode(digest(coalesce(p_key, ''), 'sha256'), 'hex');
  if not found then
    return json_build_object('auth', false, 'ok', false);
  end if;
  update public.l4_students set last_seen = now() where usn = v_usn;
  v_ok := p_level <= 2
       or exists (select 1 from public.l4_access a where a.usn = v_usn and a.level = p_level)
       or exists (select 1 from public.l4_section_access x
                   where upper(trim(x.section)) = upper(trim(coalesce(s.section, ''))) and x.level = p_level);
  return json_build_object('auth', true, 'ok', v_ok);
end $$;

-- 4c) save a student's progress snapshot
create or replace function public.l4_save(p_usn text, p_key text, p_snapshot jsonb, p_seconds integer, p_page text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_usn text := upper(trim(coalesce(p_usn, '')));
begin
  if not exists (select 1 from public.l4_students
                  where usn = v_usn and key_hash = encode(digest(coalesce(p_key, ''), 'sha256'), 'hex')) then
    return json_build_object('ok', false);
  end if;
  insert into public.l4_progress (usn, snapshot, seconds, last_page, updated_at)
  values (v_usn, coalesce(p_snapshot, '{}'::jsonb), greatest(coalesce(p_seconds, 0), 0), p_page, now())
  on conflict (usn) do update
     set snapshot   = excluded.snapshot,
         seconds    = greatest(public.l4_progress.seconds, excluded.seconds),
         last_page  = excluded.last_page,
         updated_at = now();
  update public.l4_students set last_seen = now() where usn = v_usn;
  return json_build_object('ok', true);
end $$;

-- 4d) load a student's saved progress (used when the student opens the site on a new device)
create or replace function public.l4_load(p_usn text, p_key text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_usn text := upper(trim(coalesce(p_usn, '')));
  v_snap jsonb;
begin
  if not exists (select 1 from public.l4_students
                  where usn = v_usn and key_hash = encode(digest(coalesce(p_key, ''), 'sha256'), 'hex')) then
    return json_build_object('ok', false);
  end if;
  select snapshot into v_snap from public.l4_progress where usn = v_usn;
  return json_build_object('ok', true, 'snapshot', coalesce(v_snap, '{}'::jsonb));
end $$;

-- 4e) faculty PIN check (slows down wrong guesses)
create or replace function public.l4_fac_ok(p_pin text)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare h text;
begin
  select v into h from public.l4_settings where k = 'faculty_pin_hash';
  if h is null or h <> encode(digest(coalesce(p_pin, ''), 'sha256'), 'hex') then
    perform pg_sleep(1);
    return false;
  end if;
  return true;
end $$;

-- 4f) faculty report: all students, their progress and access
create or replace function public.l4_faculty_report(p_pin text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.l4_fac_ok(p_pin) then
    return json_build_object('ok', false);
  end if;
  return json_build_object(
    'ok', true,
    'students', (
      select coalesce(json_agg(row_to_json(t) order by t.section, t.usn), '[]'::json)
      from (
        select s.usn, s.name, s.email, s.branch, s.semester, s.section, s.created_at, s.last_seen,
               p.seconds, p.last_page, p.updated_at, p.snapshot,
               (select coalesce(json_agg(a.level order by a.level), '[]'::json)
                  from public.l4_access a where a.usn = s.usn) as levels
        from public.l4_students s
        left join public.l4_progress p on p.usn = s.usn
      ) t),
    'sections', (
      select coalesce(json_agg(json_build_object('section', x.section, 'level', x.level)), '[]'::json)
      from public.l4_section_access x));
end $$;

-- 4g) faculty: unlock or lock a level for one student or a whole section
create or replace function public.l4_faculty_grant(p_pin text, p_scope text, p_target text, p_level integer, p_on boolean)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_t text := upper(trim(coalesce(p_target, '')));
begin
  if not public.l4_fac_ok(p_pin) then
    return json_build_object('ok', false);
  end if;
  if p_scope = 'student' then
    if p_on then
      if not exists (select 1 from public.l4_students where usn = v_t) then
        return json_build_object('ok', false, 'error', 'no_student');
      end if;
      insert into public.l4_access (usn, level) values (v_t, p_level) on conflict do nothing;
    else
      delete from public.l4_access where usn = v_t and level = p_level;
    end if;
  elsif p_scope = 'section' then
    if p_on then
      insert into public.l4_section_access (section, level) values (v_t, p_level) on conflict do nothing;
    else
      delete from public.l4_section_access where upper(trim(section)) = v_t and level = p_level;
    end if;
  else
    return json_build_object('ok', false, 'error', 'bad_scope');
  end if;
  return json_build_object('ok', true);
end $$;

-- 5) Allow the website (anon key) to call ONLY these functions
revoke all on function public.l4_fac_ok(text) from public, anon, authenticated;
grant execute on function public.l4_enroll(text, text, text, text, text, text, text)  to anon, authenticated;
grant execute on function public.l4_check(text, text, integer)                        to anon, authenticated;
grant execute on function public.l4_save(text, text, jsonb, integer, text)            to anon, authenticated;
grant execute on function public.l4_load(text, text)                                  to anon, authenticated;
grant execute on function public.l4_faculty_report(text)                              to anon, authenticated;
grant execute on function public.l4_faculty_grant(text, text, text, integer, boolean) to anon, authenticated;

-- To change the faculty PIN later, run:
--   update public.l4_settings set v = encode(extensions.digest('YOUR-NEW-PIN','sha256'),'hex') where k = 'faculty_pin_hash';
-- To lock a student out again, or to reset a forgotten student password, run for example:
--   delete from public.l4_students where usn = '4GS22EC001';   (they can then register again)
