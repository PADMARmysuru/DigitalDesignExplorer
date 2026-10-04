-- =====================================================================================
--  Digital Design Explorer – Part B access management + Final Capstone
--  Run ONCE in Supabase → SQL Editor (after progress-setup.sql, progress-teacher-auth.sql
--  and progress-update-level9.sql). Safe to run again.
--
--  What it does
--   1. dde_partb_access      – one Part B access record per student (UNIQUE(student_id, part))
--   2. Server-side Part B enforcement: Level 7–14 progress can only be saved by students
--      with Part B access; pages ask dde_partb_status before showing Part B content.
--   3. Final Capstone stages are stored in the EXISTING student_module_progress table as
--      level 15, module 1–12 (one row per stage) – no second progress system.
--   4. dde_capstone_eval     – faculty evaluation (rubric scores, approval) per student
--   5. Teacher functions for Part B access (grant / revoke) and capstone review.
--  All tables keep RLS ON with no direct browser access; the browser only calls functions.
-- =====================================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------- 1. Allow level 15 (Final Capstone stages) in the existing progress table ----------
alter table public.student_module_progress drop constraint if exists student_module_progress_level_check;
alter table public.student_module_progress add constraint student_module_progress_level_check check (level between 1 and 15);

-- ---------- 2. Part B access table ----------
create table if not exists public.dde_partb_access (
  id              uuid primary key default gen_random_uuid(),
  student_id      uuid not null references public."STUDENTS"(id) on delete cascade,
  part            text not null default 'B' check (part = 'B'),
  access_granted  boolean not null default false,
  granted_at      timestamptz,
  granted_by      uuid references public.dde_teachers(id) on delete set null,
  updated_at      timestamptz not null default now(),
  unique (student_id, part)
);
alter table public.dde_partb_access enable row level security;
revoke all on table public.dde_partb_access from anon, authenticated;

-- ---------- 3. Capstone evaluation table ----------
create table if not exists public.dde_capstone_eval (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null unique references public."STUDENTS"(id) on delete cascade,
  scores        jsonb not null default '{}'::jsonb,
  total         numeric(5,1) not null default 0,
  comments      text,
  approved      boolean not null default false,
  evaluated_by  uuid references public.dde_teachers(id) on delete set null,
  evaluated_at  timestamptz,
  updated_at    timestamptz not null default now()
);
alter table public.dde_capstone_eval enable row level security;
revoke all on table public.dde_capstone_eval from anon, authenticated;

-- ---------- 4. Internal helpers (NOT callable from the browser) ----------
create or replace function public.dde_session_teacher_id(p_token text)
returns uuid language sql stable security definer set search_path = public, extensions as $$
  select s.teacher_id
    from public.dde_sessions s
    join public.dde_teachers t on t.id = s.teacher_id and t.active
   where s.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
     and s.role = 'teacher' and s.expires_at > now()
   limit 1;
$$;

create or replace function public.dde_has_partb(p_student uuid)
returns boolean language sql stable security definer set search_path = public, extensions as $$
  select coalesce((select access_granted from public.dde_partb_access
                    where student_id = p_student and part = 'B'), false);
$$;

-- ---------- 5. Part B status for the page guard (student OR teacher session) ----------
create or replace function public.dde_partb_status(p_token text)
returns json language plpgsql stable security definer set search_path = public, extensions as $$
declare v_student uuid := public.dde_session_student(p_token);
begin
  if v_student is not null then
    return json_build_object('ok', true, 'role', 'student', 'granted', public.dde_has_partb(v_student));
  end if;
  if public.dde_session_teacher_id(p_token) is not null then
    return json_build_object('ok', true, 'role', 'teacher', 'granted', true);
  end if;
  return json_build_object('ok', false, 'error', 'not_logged_in');
end $$;

-- ---------- 6. Existing save functions + Part B enforcement for levels 7–14 ----------
create or replace function public.dde_save_module(p_token text, p_level integer, p_module integer, p_data jsonb)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_student uuid := public.dde_session_student(p_token);
  v_ac  integer := coalesce((p_data->>'activities_completed')::integer, 0);
  v_at  integer := coalesce((p_data->>'activities_total')::integer, 0);
  v_cc  boolean := (p_data->>'concepts_completed')::boolean;
  v_pc  boolean := (p_data->>'practice_completed')::boolean;
  v_hq  boolean := coalesce((p_data->>'has_quiz')::boolean, false);
  v_qp  boolean := (p_data->>'quiz_passed')::boolean;
  v_det jsonb   := coalesce(p_data->'details', '{}'::jsonb);
  v_id  uuid;
begin
  if v_student is null then return json_build_object('ok', false, 'error', 'not_logged_in'); end if;
  if p_level not between 1 and 14 or p_module not between 1 and 40
     or v_at < 0 or v_at > 500 or v_ac < 0 or v_ac > v_at then
    return json_build_object('ok', false, 'error', 'invalid_data');
  end if;
  if p_level between 7 and 14 and not public.dde_has_partb(v_student) then
    return json_build_object('ok', false, 'error', 'no_partb_access');
  end if;
  insert into public.student_module_progress as m
    (student_id, level, module, concepts_completed, activities_completed, activities_total,
     practice_completed, quiz_completed, details)
  values (v_student, p_level, p_module, v_cc, v_ac, v_at, v_pc,
          case when v_qp is not null then v_qp when v_hq then false end, v_det)
  on conflict (student_id, level, module) do update set
    activities_total     = greatest(m.activities_total, excluded.activities_total),
    activities_completed = greatest(m.activities_completed, excluded.activities_completed),
    concepts_completed   = case when excluded.concepts_completed is null then m.concepts_completed
                                else coalesce(m.concepts_completed, false) or excluded.concepts_completed end,
    practice_completed   = case when excluded.practice_completed is null then m.practice_completed
                                else coalesce(m.practice_completed, false) or excluded.practice_completed end,
    quiz_completed       = case when v_qp is not null then v_qp
                                when m.quiz_completed is null and v_hq then false else m.quiz_completed end,
    details              = case when excluded.activities_completed >= m.activities_completed then excluded.details else m.details end
  returning m.id into v_id;
  perform public.dde_recompute(v_id);
  return json_build_object('ok', true, 'progress',
    (select row_to_json(t) from (select level, module, progress_percent, completed, updated_at
                                   from public.student_module_progress where id = v_id) t));
end $$;

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
  if p_level between 7 and 14 and not public.dde_has_partb(v_student) then
    return json_build_object('ok', false, 'error', 'no_partb_access');
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

-- ---------- 7. Teacher report (unchanged rows + Part B access column) ----------
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
                    (p.id is not null) as has_record,
                    public.dde_has_partb(s.id) as partb_access
               from public."STUDENTS" s
               left join public.student_module_progress p
                      on p.student_id = s.id and p.level = p_level and p.module = p_module) t));
end $$;

-- ---------- 8. Part B access management (teachers only) ----------
create or replace function public.dde_teacher_partb_list(p_token text)
returns json language plpgsql security definer set search_path = public, extensions as $$
begin
  if public.dde_session_teacher_id(p_token) is null then return json_build_object('ok', false, 'error', 'not_teacher'); end if;
  return json_build_object('ok', true, 'students',
    (select coalesce(json_agg(row_to_json(t) order by t.section, t.usn), '[]'::json)
       from (select s.student_id as usn, s.student_name as name, s.section, s.semester, s.branch,
                    coalesce(a.access_granted, false) as granted, a.granted_at, a.updated_at,
                    t2.name as granted_by
               from public."STUDENTS" s
               left join public.dde_partb_access a on a.student_id = s.id and a.part = 'B'
               left join public.dde_teachers t2 on t2.id = a.granted_by) t));
end $$;

create or replace function public.dde_teacher_partb_set(p_token text, p_usns text[], p_grant boolean)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_teacher uuid := public.dde_session_teacher_id(p_token);
  v_n integer;
begin
  if v_teacher is null then return json_build_object('ok', false, 'error', 'not_teacher'); end if;
  if p_usns is null or array_length(p_usns, 1) is null or array_length(p_usns, 1) > 1000 or p_grant is null then
    return json_build_object('ok', false, 'error', 'invalid_data');
  end if;
  insert into public.dde_partb_access as a (student_id, part, access_granted, granted_at, granted_by, updated_at)
  select s.id, 'B', p_grant, case when p_grant then now() end, case when p_grant then v_teacher end, now()
    from public."STUDENTS" s
   where s.student_id = any (select upper(trim(u)) from unnest(p_usns) u)
  on conflict (student_id, part) do update set
    access_granted = excluded.access_granted,
    granted_at     = case when excluded.access_granted and not a.access_granted then now()
                          when excluded.access_granted then a.granted_at end,
    granted_by     = case when excluded.access_granted and not a.access_granted then v_teacher
                          when excluded.access_granted then a.granted_by end,
    updated_at     = now();
  get diagnostics v_n = row_count;
  return json_build_object('ok', true, 'changed', v_n);
end $$;

-- ---------- 9. Final Capstone (students) ----------
create or replace function public.dde_capstone_save(p_token text, p_stage integer, p_data jsonb, p_complete boolean)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_student uuid := public.dde_session_student(p_token);
  v_id uuid;
  v_done integer;
begin
  if v_student is null then return json_build_object('ok', false, 'error', 'not_logged_in'); end if;
  if not public.dde_has_partb(v_student) then return json_build_object('ok', false, 'error', 'no_partb_access'); end if;
  if p_stage not between 1 and 12 or p_data is null or jsonb_typeof(p_data) <> 'object' or length(p_data::text) > 60000 then
    return json_build_object('ok', false, 'error', 'invalid_data');
  end if;
  if exists (select 1 from public.dde_capstone_eval where student_id = v_student and approved) then
    return json_build_object('ok', false, 'error', 'locked_after_approval');
  end if;
  if p_stage = 12 and coalesce(p_complete, false) then
    select count(*) into v_done from public.student_module_progress
     where student_id = v_student and level = 15 and module between 1 and 11 and completed;
    if v_done < 11 then return json_build_object('ok', false, 'error', 'stages_incomplete'); end if;
    p_data := p_data || jsonb_build_object('submitted_at', now());
  end if;
  insert into public.student_module_progress as m (student_id, level, module, activities_total, activities_completed, details)
  values (v_student, 15, p_stage, 1, case when coalesce(p_complete, false) then 1 else 0 end, p_data)
  on conflict (student_id, level, module) do update set
    activities_total     = 1,
    activities_completed = greatest(m.activities_completed, excluded.activities_completed),
    details              = excluded.details
  returning m.id into v_id;
  perform public.dde_recompute(v_id);
  return json_build_object('ok', true, 'stage', p_stage,
    'completed', (select completed from public.student_module_progress where id = v_id));
end $$;

create or replace function public.dde_capstone_load(p_token text)
returns json language plpgsql stable security definer set search_path = public, extensions as $$
declare v_student uuid := public.dde_session_student(p_token);
begin
  if v_student is null then return json_build_object('ok', false, 'error', 'not_logged_in'); end if;
  return json_build_object('ok', true, 'granted', public.dde_has_partb(v_student),
    'student', public.dde_profile(v_student),
    'stages', (select coalesce(json_agg(json_build_object('stage', module, 'details', details,
                        'completed', completed, 'updated_at', updated_at) order by module), '[]'::json)
                 from public.student_module_progress where student_id = v_student and level = 15),
    'evaluation', (select row_to_json(e) from (select e.scores, e.total, e.comments, e.approved, e.evaluated_at,
                          t.name as evaluated_by
                     from public.dde_capstone_eval e left join public.dde_teachers t on t.id = e.evaluated_by
                    where e.student_id = v_student) e));
end $$;

-- ---------- 10. Final Capstone (teachers) ----------
create or replace function public.dde_teacher_capstone_list(p_token text)
returns json language plpgsql stable security definer set search_path = public, extensions as $$
begin
  if public.dde_session_teacher_id(p_token) is null then return json_build_object('ok', false, 'error', 'not_teacher'); end if;
  return json_build_object('ok', true, 'students',
    (select coalesce(json_agg(row_to_json(t) order by t.section, t.usn), '[]'::json)
       from (select s.student_id as usn, s.student_name as name, s.section,
                    public.dde_has_partb(s.id) as partb_access,
                    st1.details->>'title' as title, st1.details->>'type' as project_type,
                    st1.details->>'team' as team, st1.details->>'topic' as topic,
                    (select count(*) from public.student_module_progress x
                      where x.student_id = s.id and x.level = 15 and x.completed) as stages_done,
                    (select count(*) from public.student_module_progress x
                      where x.student_id = s.id and x.level = 15) as stages_started,
                    (select max(updated_at) from public.student_module_progress x
                      where x.student_id = s.id and x.level = 15) as updated_at,
                    st12.details->>'submitted_at' as submitted_at,
                    (select count(*) from public.student_module_progress x
                      where x.student_id = s.id and x.level between 7 and 14 and x.completed) as partb_modules_completed,
                    e.total as score, e.approved, e.evaluated_at
               from public."STUDENTS" s
               left join public.student_module_progress st1 on st1.student_id = s.id and st1.level = 15 and st1.module = 1
               left join public.student_module_progress st12 on st12.student_id = s.id and st12.level = 15 and st12.module = 12 and st12.completed
               left join public.dde_capstone_eval e on e.student_id = s.id) t));
end $$;

create or replace function public.dde_teacher_capstone_get(p_token text, p_usn text)
returns json language plpgsql stable security definer set search_path = public, extensions as $$
declare v_student uuid;
begin
  if public.dde_session_teacher_id(p_token) is null then return json_build_object('ok', false, 'error', 'not_teacher'); end if;
  select id into v_student from public."STUDENTS" where student_id = upper(trim(coalesce(p_usn, '')));
  if v_student is null then return json_build_object('ok', false, 'error', 'no_student'); end if;
  return json_build_object('ok', true, 'student', public.dde_profile(v_student),
    'partb_access', public.dde_has_partb(v_student),
    'stages', (select coalesce(json_agg(json_build_object('stage', module, 'details', details,
                        'completed', completed, 'updated_at', updated_at) order by module), '[]'::json)
                 from public.student_module_progress where student_id = v_student and level = 15),
    'evaluation', (select row_to_json(e) from (select e.scores, e.total, e.comments, e.approved, e.evaluated_at,
                          t.name as evaluated_by
                     from public.dde_capstone_eval e left join public.dde_teachers t on t.id = e.evaluated_by
                    where e.student_id = v_student) e));
end $$;

-- Rubric (maximum marks): problem 5, architecture 10, vlsi 10, rtl 10, timing 10, physical 10,
-- verification 10, dft 10, performance 10, aiml 5, documentation 10  → total 100
create or replace function public.dde_teacher_capstone_evaluate(p_token text, p_usn text, p_scores jsonb, p_comments text, p_approve boolean)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare
  v_teacher uuid := public.dde_session_teacher_id(p_token);
  v_student uuid;
  v_rubric jsonb := '{"problem":5,"architecture":10,"vlsi":10,"rtl":10,"timing":10,"physical":10,"verification":10,"dft":10,"performance":10,"aiml":5,"documentation":10}';
  k text; v numeric; v_total numeric := 0; v_clean jsonb := '{}'::jsonb;
begin
  if v_teacher is null then return json_build_object('ok', false, 'error', 'not_teacher'); end if;
  select id into v_student from public."STUDENTS" where student_id = upper(trim(coalesce(p_usn, '')));
  if v_student is null then return json_build_object('ok', false, 'error', 'no_student'); end if;
  if p_scores is null or jsonb_typeof(p_scores) <> 'object' then return json_build_object('ok', false, 'error', 'invalid_data'); end if;
  for k in select jsonb_object_keys(v_rubric) loop
    begin v := coalesce((p_scores->>k)::numeric, 0); exception when others then return json_build_object('ok', false, 'error', 'invalid_data'); end;
    if v < 0 or v > (v_rubric->>k)::numeric then return json_build_object('ok', false, 'error', 'score_out_of_range', 'field', k); end if;
    v_clean := v_clean || jsonb_build_object(k, v); v_total := v_total + v;
  end loop;
  if coalesce(p_approve, false) and not exists (select 1 from public.student_module_progress
       where student_id = v_student and level = 15 and module = 12 and completed) then
    return json_build_object('ok', false, 'error', 'not_submitted');
  end if;
  insert into public.dde_capstone_eval as e (student_id, scores, total, comments, approved, evaluated_by, evaluated_at, updated_at)
  values (v_student, v_clean, v_total, left(p_comments, 4000), coalesce(p_approve, false), v_teacher, now(), now())
  on conflict (student_id) do update set
    scores = excluded.scores, total = excluded.total, comments = excluded.comments,
    approved = excluded.approved, evaluated_by = excluded.evaluated_by, evaluated_at = now(), updated_at = now();
  return json_build_object('ok', true, 'total', v_total, 'approved', coalesce(p_approve, false));
end $$;

-- ---------- 11. Permissions: browser may call only these functions ----------
revoke all on function public.dde_session_teacher_id(text) from public, anon, authenticated;
revoke all on function public.dde_has_partb(uuid)          from public, anon, authenticated;

revoke all on function public.dde_partb_status(text)                                         from public;
revoke all on function public.dde_save_module(text, integer, integer, jsonb)                 from public;
revoke all on function public.dde_record_quiz(text, integer, integer, integer, integer)      from public;
revoke all on function public.dde_teacher_report(text, integer, integer)                     from public;
revoke all on function public.dde_teacher_partb_list(text)                                   from public;
revoke all on function public.dde_teacher_partb_set(text, text[], boolean)                   from public;
revoke all on function public.dde_capstone_save(text, integer, jsonb, boolean)               from public;
revoke all on function public.dde_capstone_load(text)                                        from public;
revoke all on function public.dde_teacher_capstone_list(text)                                from public;
revoke all on function public.dde_teacher_capstone_get(text, text)                           from public;
revoke all on function public.dde_teacher_capstone_evaluate(text, text, jsonb, text, boolean) from public;

grant execute on function public.dde_partb_status(text)                                         to anon, authenticated;
grant execute on function public.dde_save_module(text, integer, integer, jsonb)                 to anon, authenticated;
grant execute on function public.dde_record_quiz(text, integer, integer, integer, integer)      to anon, authenticated;
grant execute on function public.dde_teacher_report(text, integer, integer)                     to anon, authenticated;
grant execute on function public.dde_teacher_partb_list(text)                                   to anon, authenticated;
grant execute on function public.dde_teacher_partb_set(text, text[], boolean)                   to anon, authenticated;
grant execute on function public.dde_capstone_save(text, integer, jsonb, boolean)               to anon, authenticated;
grant execute on function public.dde_capstone_load(text)                                        to anon, authenticated;
grant execute on function public.dde_teacher_capstone_list(text)                                to anon, authenticated;
grant execute on function public.dde_teacher_capstone_get(text, text)                           to anon, authenticated;
grant execute on function public.dde_teacher_capstone_evaluate(text, text, jsonb, text, boolean) to anon, authenticated;

-- Done. Next: run progress-selftest.sql – it now also checks Part B and the capstone.
