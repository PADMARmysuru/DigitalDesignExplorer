-- =====================================================================
-- Digital Design Explorer – progress update for Level 9 (run ONCE)
-- Supabase Dashboard > SQL Editor > New query > paste > Run.
-- Changes ONE function: a module's quiz can count only when it is PASSED
-- (used by Level 9). Level 1 behaviour is unchanged. No data is touched.
-- =====================================================================

-- Save the non-quiz items of one module. Progress never goes backwards.
-- p_data: {"activities_completed":5,"activities_total":7,"concepts_completed":null,
--          "practice_completed":null,"has_quiz":false,"quiz_passed":true,"details":{...}}
-- "quiz_passed" (optional) makes the quiz count only when passed (Part B levels).
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


notify pgrst, 'reload schema';
