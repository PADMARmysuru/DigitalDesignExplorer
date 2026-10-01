-- =====================================================================
-- Digital Design Explorer: enforce the USN format inside Supabase
-- ---------------------------------------------------------------------
-- The website already rejects invalid USNs before sending anything.
-- This rule makes the DATABASE reject them too, so nobody can bypass
-- the website and insert an invalid USN directly with the public key.
--
-- Run ONCE: Supabase Dashboard > SQL Editor > New query > paste > Run.
--
-- "NOT VALID" means rows that are ALREADY in the table are not checked
-- or changed. Only new registrations and edits must match 4GWxxECxxx.
-- =====================================================================

alter table public."STUDENTS"
  add constraint students_usn_format
  check (student_id ~ '^4GW[0-9]{2}EC[0-9]{3}$') not valid;

-- To see existing rows that do NOT match the format (read only):
-- select id, student_id, student_name, email from public."STUDENTS"
-- where student_id !~ '^4GW[0-9]{2}EC[0-9]{3}$';

-- To remove the rule again:
-- alter table public."STUDENTS" drop constraint students_usn_format;
