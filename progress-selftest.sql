-- =====================================================================
-- Digital Design Explorer – self-test for progress-setup.sql
-- Run AFTER progress-setup.sql and progress-teacher-auth.sql:
-- SQL Editor > New query > paste > Run.
-- It creates a temporary test student (4GW99EC999) and a temporary test
-- teacher, checks every step, deletes both again and shows PASS / FAIL.
-- Real students and teachers are not touched.
-- =====================================================================
drop table if exists dde_test_results;
create temp table dde_test_results (n serial, step text, ok boolean, detail text);

do $$
declare
  v_usn text := '4GW99EC999';
  r     json;
  tok   text;
  ttok  text;
  x     json;
  c     integer;
  procedure_ok boolean;
begin
  delete from public."STUDENTS" where upper(student_id) = v_usn;   -- leftovers from an earlier test
  delete from public.dde_teachers where lower(email) = 'selftest-teacher@example.com';

  r := public.dde_register(v_usn, 'Self Test', 'selftest@example.com', 'ECE', '6', 'a', 'test-pass-123');
  insert into dde_test_results (step, ok, detail) values ('01 register a new student', coalesce((r->>'ok')::boolean, false), r->>'error');

  r := public.dde_register(v_usn, 'Copy', 'x@example.com', 'ECE', '6', 'A', 'other-pass');
  insert into dde_test_results (step, ok, detail) values ('02 same USN cannot register twice', r->>'error' = 'already_registered', r->>'error');

  r := public.dde_register('4GS22CS001', 'Bad', 'b@example.com', 'ECE', '6', 'A', 'pass1234');
  insert into dde_test_results (step, ok, detail) values ('03 invalid USN rejected', r->>'error' = 'invalid_usn', r->>'error');

  r := public.dde_login(v_usn, 'selftest@example.com', 'wrong-password');
  insert into dde_test_results (step, ok, detail) values ('04 wrong password rejected', r->>'error' = 'wrong_credentials', r->>'error');

  r := public.dde_login(lower(v_usn), 'SELFTEST@example.com', 'test-pass-123');
  tok := r->>'token';
  insert into dde_test_results (step, ok, detail) values ('05 login works (any device)', tok is not null, r->'student'->>'name');

  r := public.dde_save_module(tok, 1, 1, '{"activities_completed":3,"activities_total":7,"details":{"gates":["AND","OR","NOT"]}}');
  insert into dde_test_results (step, ok, detail) values ('06 Module 1: 3 of 7 gates -> 42%', (r->'progress'->>'progress_percent')::int = 42, r::text);

  r := public.dde_save_module(tok, 1, 1, '{"activities_completed":7,"activities_total":7,"details":{"gates":["AND","OR","NOT","NAND","NOR","XOR","XNOR"]}}');
  insert into dde_test_results (step, ok, detail) values ('07 Module 1: 7 of 7 gates -> 100% complete',
    (r->'progress'->>'progress_percent')::int = 100 and (r->'progress'->>'completed')::boolean, r::text);

  r := public.dde_save_module(tok, 1, 1, '{"activities_completed":2,"activities_total":7}');
  insert into dde_test_results (step, ok, detail) values ('08 progress never goes backwards', (r->'progress'->>'progress_percent')::int = 100, r::text);

  select count(*) into c from public.student_module_progress p join public."STUDENTS" s on s.id = p.student_id
   where upper(s.student_id) = v_usn and p.level = 1 and p.module = 1;
  insert into dde_test_results (step, ok, detail) values ('09 exactly one row per student + level + module', c = 1, c || ' row(s)');

  r := public.dde_save_module(tok, 1, 5, '{"activities_completed":0,"activities_total":0,"has_quiz":true}');
  insert into dde_test_results (step, ok, detail) values ('10 quiz module before any attempt -> 0%', (r->'progress'->>'progress_percent')::int = 0, r::text);

  r := public.dde_record_quiz(tok, 1, 5, 6, 10);
  r := public.dde_record_quiz(tok, 1, 5, 9, 10);
  r := public.dde_record_quiz(tok, 1, 5, 7, 10);
  insert into dde_test_results (step, ok, detail) values ('11 quiz: latest 7, best 9, attempts 3',
    (r->'progress'->>'latest_score')::int = 7 and (r->'progress'->>'best_score')::int = 9 and (r->'progress'->>'attempt_count')::int = 3, r::text);

  select count(*) into c from public.student_quiz_attempts a join public."STUDENTS" s on s.id = a.student_id where upper(s.student_id) = v_usn;
  insert into dde_test_results (step, ok, detail) values ('12 every quiz attempt is kept', c = 3, c || ' attempt(s)');

  r := public.dde_record_quiz(tok, 1, 5, 11, 10);
  insert into dde_test_results (step, ok, detail) values ('13 impossible score rejected', r->>'error' = 'invalid_data', r->>'error');

  r := public.dde_save_module('not-a-real-token', 1, 1, '{"activities_completed":1,"activities_total":7}');
  insert into dde_test_results (step, ok, detail) values ('14 save without login rejected', r->>'error' = 'not_logged_in', r->>'error');

  r := public.dde_teacher_report(tok, 1, 1);
  insert into dde_test_results (step, ok, detail) values ('15 student cannot open teacher report', r->>'error' = 'not_teacher', r->>'error');

  perform public.dde_admin_set_teacher('selftest-teacher@example.com', 'Self Test Teacher', 'teacher-pass-123');
  r := public.dde_teacher_login('selftest-teacher@example.com', 'wrong-password');
  insert into dde_test_results (step, ok, detail) values ('15b teacher wrong password rejected', r->>'error' = 'wrong_credentials', r->>'error');
  r := public.dde_teacher_login('SELFTEST-TEACHER@example.com', 'teacher-pass-123');
  ttok := r->>'token';
  insert into dde_test_results (step, ok, detail) values ('15c teacher email + password login works', ttok is not null, r->'teacher'->>'name');
  r := public.dde_teacher_me(ttok);
  insert into dde_test_results (step, ok, detail) values ('15d dashboard can confirm the teacher session', coalesce((r->>'ok')::boolean, false), null);
  r := public.dde_teacher_me(tok);
  insert into dde_test_results (step, ok, detail) values ('15e a STUDENT session is not a teacher session', r->>'error' = 'not_teacher', r->>'error');
  r := public.dde_teacher_report(ttok, 1, 1);
  select e into x from json_array_elements(r->'students') e where upper(e->>'usn') = v_usn;
  insert into dde_test_results (step, ok, detail) values ('16 teacher report shows the student at 100%',
    (x->>'progress_percent')::int = 100, coalesce(x::text, 'student missing'));

  r := public.dde_teacher_report(ttok, 1, 2);
  select e into x from json_array_elements(r->'students') e where upper(e->>'usn') = v_usn;
  insert into dde_test_results (step, ok, detail) values ('17 module with no record still lists the student (0%, not started)',
    x is not null and (x->>'has_record')::boolean = false and (x->>'progress_percent')::int = 0, coalesce(x::text, 'student missing'));

  r := public.dde_teacher_student(ttok, v_usn);
  insert into dde_test_results (step, ok, detail) values ('18 teacher student detail (no password shown)',
    json_array_length(r->'attempts') = 3 and r::text not like '%password%', json_array_length(r->'modules') || ' module row(s)');

  r := public.dde_load_progress(tok);
  insert into dde_test_results (step, ok, detail) values ('19 student can load own progress', json_array_length(r->'modules') = 2, null);

  insert into dde_test_results (step, ok, detail) values ('20 browser cannot read STUDENTS directly',
    not has_table_privilege('anon', 'public."STUDENTS"', 'select') and not has_table_privilege('anon', 'public."STUDENTS"', 'insert'), null);
  insert into dde_test_results (step, ok, detail) values ('21 browser cannot read/write progress tables directly',
    not has_table_privilege('anon', 'public.student_module_progress', 'select')
    and not has_table_privilege('anon', 'public.student_module_progress', 'insert')
    and not has_table_privilege('anon', 'public.student_progress', 'update'), null);
  insert into dde_test_results (step, ok, detail) values ('22 browser cannot call internal helpers',
    not has_function_privilege('anon', 'public.dde_new_session(uuid, text)', 'execute'), null);
  insert into dde_test_results (step, ok, detail) values ('23 browser can call the website functions',
    has_function_privilege('anon', 'public.dde_save_module(text, integer, integer, jsonb)', 'execute')
    and has_function_privilege('anon', 'public.dde_teacher_report(text, integer, integer)', 'execute'), null);

  select count(*) into c from pg_class where relkind = 'r' and relrowsecurity
     and relname in ('STUDENTS', 'student_progress', 'student_module_progress', 'student_quiz_attempts', 'dde_sessions', 'dde_settings');
  insert into dde_test_results (step, ok, detail) values ('24 row level security ON for all 6 tables', c = 6, c || ' of 6');

  insert into dde_test_results (step, ok, detail) values ('25 browser cannot read teacher accounts or call the admin function',
    not has_table_privilege('anon', 'public.dde_teachers', 'select')
    and not has_function_privilege('anon', 'public.dde_admin_set_teacher(text, text, text)', 'execute'), null);

  update public.dde_teachers set active = false where lower(email) = 'selftest-teacher@example.com';
  r := public.dde_teacher_report(ttok, 1, 1);
  insert into dde_test_results (step, ok, detail) values ('26 a deactivated teacher loses access immediately', r->>'error' = 'not_teacher', r->>'error');

  select count(*) into c from public.dde_teachers where active and lower(email) <> 'selftest-teacher@example.com';
  insert into dde_test_results (step, ok, detail) values ('27 at least one real teacher account exists', c >= 1,
    case when c = 0 then 'Run section 5 of progress-teacher-auth.sql with your email' else c || ' teacher account(s)' end);
  select count(*) into c from public.dde_teachers where lower(email) = 'your.email@gsss.edu.in';
  insert into dde_test_results (step, ok, detail) values ('28 example teacher email was replaced with a real one', c = 0,
    case when c > 0 then 'Remove it: delete from public.dde_teachers where email = ''your.email@gsss.edu.in'';' end);

  r := public.dde_record_quiz(tok, 9, 1, 5, 10);
  r := public.dde_save_module(tok, 9, 1, '{"activities_completed":3,"activities_total":3,"concepts_completed":true,"practice_completed":true,"has_quiz":true,"quiz_passed":false}');
  insert into dde_test_results (step, ok, detail) values ('29 Level 9: failed quiz (5/10) keeps module below 100%',
    (r->'progress'->>'progress_percent')::int = 75 and not (r->'progress'->>'completed')::boolean, r::text);
  r := public.dde_save_module(tok, 9, 1, '{"activities_completed":3,"activities_total":3,"concepts_completed":true,"practice_completed":true,"has_quiz":true,"quiz_passed":true}');
  insert into dde_test_results (step, ok, detail) values ('30 Level 9: passed quiz -> module 100% complete',
    (r->'progress'->>'progress_percent')::int = 100 and (r->'progress'->>'completed')::boolean, r::text);

  -- clean up
  delete from public.dde_teachers where lower(email) = 'selftest-teacher@example.com';
  delete from public."STUDENTS" where upper(student_id) = v_usn;
end $$;

select step, case when ok then '✅ PASS' else '❌ FAIL' end as result, detail
from dde_test_results order by n;
