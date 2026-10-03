# Digital Design Explorer – platform update (October 2026)

## How to install

1. Back up your current `D:\DigitalDesignExplorer` folder first, so you can return to it if anything goes wrong.
2. Copy every file and folder from this update into `D:\DigitalDesignExplorer`, replacing files when Windows asks.
   Keep your own `images` folder (it was not in the ZIP, so it is not touched).
3. Level 6 now lives in two folders, as its pages expect: `css/level6.css` and `js/level6-*.js`.
   You can delete the old copies of `level6.css`, `level6-common.js` and `level6-module*.js` from the root folder.
4. Push with git as usual.
5. Optional but recommended: run `usn-check.sql` once in Supabase (SQL Editor) so the database itself refuses invalid USNs.

## How to release a level

Open `access-control.js` and change one word:

```javascript
level4: false,   →   level4: true,
```

Save and push. Every Level 4 page opens for students. Do the same for `level5` and `level6`.

## New files

| File | Purpose |
|---|---|
| `access-control.js` | `LEVEL_ACCESS` switch, USN rule, login and level check on every page |
| `common.js` | Header, navigation, breadcrumbs, footer, dashboard overview, certificate |
| `common.css` | The common design system |
| `locked.html` | The "Level is currently locked" screen |
| `level6-certificate.html` | New Level 6 certificate |
| `usn-check.sql` | Optional Supabase rule for the USN format |

## Things students will notice

- Login now asks for the USN as well as email and password.
- Every page needs a login (the home page and login page stay public).
- A student whose saved USN is not in `4GWxxECxxx` format must register again.
- Existing progress is kept: no progress key was renamed or reset.

## Level 7 – Digital VLSI Design (Part B)

Level 7 is installed but **locked**. To open it for students, edit `access-control.js` and change

    level7: false,

to

    level7: true,

then upload the file.

New files for Level 7 (Levels 1–6 content is unchanged):

- `level7.html` – Level 7 dashboard (progress ring, module cards, certificate card)
- `level7-module1.html` … `level7-module10.html` – the ten modules
- `level7-certificate.html` – certificate (unlocks when all ten modules are completed)
- `css/level7.css` – the Part B design (clean light theme with tabbed modules, different from Part A)
- `js/level7-common.js` – shared engine: labs, animations, drag & drop, quizzes, progress
- `js/level7-module1.js` … `js/level7-module10.js` – content of each module

Shared files updated: `access-control.js` (Level 7 entry), `common.js` (Level 7 in menus, student dashboard and certificate), `index.html` (Level 7 card opens Level 7), `dashboard.html` (Level 1 progress cards now open their pages).

Progress is stored in the student's browser (`dde_level7_progress`, `level7_moduleN_completed`, and `dde_level7_project` for the mini-project tracker), like the other levels.

## Level 8 – VLSI Timing & Power (Part B)

Level 8 is installed but **locked**. To open it for students, edit `access-control.js` and change

    level8: false,

to

    level8: true,

then upload the file. Levels 9–14 remain "coming soon". Levels 1–7 access is not affected.

New files for Level 8:

- `level8.html` – Level 8 dashboard (progress ring, module cards, certificate card)
- `level8-module1.html` … `level8-module10.html` – the ten modules
- `level8-certificate.html` – certificate (unlocks when all ten modules are completed)
- `js/level8-module1.js` … `js/level8-module10.js` – content of each module

Level 8 reuses the Level 7 design and engine – there is no separate Level 8 stylesheet or engine:

- `js/level7-common.js` is now the shared Part B engine. Each page says which level it belongs to with `<body data-level="8">`.
- `css/level7.css` is the shared Part B stylesheet (timing-diagram and verdict styles were added).

Quiz upgrade (applies to Level 7 and Level 8): every attempt is recorded; the quiz shows Previous / Latest / Best score and the number of attempts, and a "Retake Quiz" button. Questions carry an Easy / Medium / Hard tag.

Shared files updated: `access-control.js` (Level 8 entry), `common.js` (Level 8 in menus, student dashboard and certificate), `index.html` (Level 8 card opens Level 8).

Progress is stored in the student's browser (`dde_level8_progress`, `level8_moduleN_completed`), in the same format as Level 7.

## Student progress in Supabase + Teacher Dashboard

### One-time setup (Supabase)
1. Open `progress-setup.sql`. In section 7, replace `CHANGE-THIS-PIN` with your own teacher PIN (at least 8 characters).
2. Supabase Dashboard → SQL Editor → New query → paste the whole file → Run.
3. New query → paste `progress-selftest.sql` → Run. Every line should show ✅ PASS. (It uses a temporary test student and deletes it again.)
4. Upload the website files and push to GitHub.

### Teacher dashboard
Open **👩‍🏫 Teacher Dashboard 🔐** in the menu. Without a teacher login it goes to `teacher-login.html` (email + password). After login: choose Level and Module (Level 1 → Module 1 = Logic Gates), filter by section, student or status, click a student for details, or download a CSV.

Teacher accounts live in Supabase (`dde_teachers`), separate from students; passwords are stored only as hashes. Set them up once with `progress-teacher-auth.sql` (put your email, name and password in section 5).

Add a teacher or reset a teacher password (SQL Editor):
    select public.dde_admin_set_teacher('name@gsss.edu.in', 'Teacher Name', 'NewPassword123');

Remove a teacher's access:
    update public.dde_teachers set active = false where lower(email) = 'name@gsss.edu.in';

To reset a student who forgot the password (they can register again):
    delete from public."STUDENTS" where student_id = '4GW24EC001';

### Who needs to log in
- Learning content (every released level) opens WITHOUT login, so teachers can teach with it. Locked levels stay locked (LEVEL_ACCESS).
- Student login is required only for the student dashboard and certificates. Progress is saved only for logged-in students.
- Teacher login is required for the teacher dashboard. The server checks every request.

### How it works
- `STUDENTS` (id uuid) remains the only student identity. Login is now checked on the server (hashed password), so it works on any device; the old on-device login is kept as an offline fallback.
- `student_module_progress` holds one row per student + level + module; `student_quiz_attempts` keeps every quiz attempt.
- The browser never reads or writes tables directly (row level security stays ON). It calls the `dde_*` functions through `js/progress-sync.js`.
- localStorage keys are unchanged and remain the on-device state. If a save fails, the student sees a message and the save is retried automatically.

### Level 1 modules tracked (order of the Level 1 dashboard)
1 Logic Gates (7 gates) · 2 Half Adder · 3 Full Adder · 4 Verilog Practice (10 programs) · 5 Quiz (best / latest / attempts) · 6 K-Map · 7 Quine–McCluskey · 8 Digital Logic Lab (8 experiments).
Module 1 saves from its own page. Modules 2–8 are saved whenever the student opens the Level 1 dashboard; the quiz and K-Map pages also save directly.

### Adding another level later
Add the level's modules to `CATALOG` in `js/progress-sync.js` (which localStorage keys mean "done"), then call `DDEProgress.syncModule(level, module)` from that module's page. The database and the teacher dashboard need no changes.
