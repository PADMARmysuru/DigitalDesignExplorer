/* =====================================================================
   Digital Design Explorer – central access control
   ---------------------------------------------------------------------
   THIS IS THE ONLY PLACE TO RELEASE A LEVEL.
   To release a level, change false to true below, save, and push.
   Every page of that level (dashboard, modules, quizzes, practice,
   certificate) opens automatically. Nothing else needs editing.
   ===================================================================== */
var LEVEL_ACCESS = {
  level1: true,   // Digital Design Fundamentals
  level2: false,   // Digital Circuit Design
  level3: false,   // Verilog for Beginners
  level4: false,  // VLSI Basics       (locked until you release it)
  level5: false,  // VLSI Testing      (locked until you release it)
  level6: false,   // SystemVerilog     (locked until you release it)
  // ---- Part B: Advanced VLSI ----
  level7: false,  // Digital VLSI Design (locked until you release it)
  level8: false,  // VLSI Timing & Power (locked until you release it)
  level9: false,  // RTL Design & Synthesis (locked until you release it)
};

/* Only ECE students of GSSSIETW: 4GW + 2 digits + EC + 3 digits, e.g. 4GW24EC001 */
var USN_PATTERN = /^4GW\d{2}EC\d{3}$/;

(function () {
  'use strict';

  /* Which level each page belongs to. Pages not listed here belong to no level. */
  var LEVEL_PAGES = {
    1: ['dashboard.html', 'logic-gates.html', 'half-adder.html', 'full-adder.html', 'kmap.html',
        'quine-mccluskey.html', 'verilog.html', 'practice.html', 'quiz.html', 'digital-logic-lab.html',
        'gate.html', 'interview.html', 'interview-test.html', 'certificate.html'],
    2: ['level2-dashboard.html', 'gate-realization.html', 'sequential-circuits.html',
        'sequential-circuits-20-problems.html', 'counters.html', 'registers.html',
        'state-machines.html', 'level2-certificate.html'],
    3: ['level3-dashboard.html', 'verilog-basics.html', 'verilog-structural.html', 'verilog-dataflow.html',
        'verilog-behavioral.html', 'verilog-rtl.html', 'verilog-testbench-verification.html',
        'level3-certificate.html'],
    4: ['level4-dashboard.html', 'level4-module1.html', 'level4-module2.html', 'level4-module3.html',
        'level4-module4.html', 'level4-module5.html', 'level4-module6.html', 'level4-module7.html',
        'level4-module8.html', 'level4-certificate.html'],
    5: ['level5-dashboard.html', 'level5-module1.html', 'level5-module2.html', 'level5-module3.html',
        'level5-module4.html', 'level5-module5.html', 'level5-module6.html', 'level5-certificate.html'],
    6: ['level6.html', 'level6-module1.html', 'level6-module2.html', 'level6-module3.html',
        'level6-module4.html', 'level6-module5.html', 'level6-module6.html', 'level6-module7.html',
        'level6-module8.html', 'level6-module9.html', 'level6-module10.html', 'level6-module11.html',
        'level6-module12.html', 'level6-certificate.html'],
    7: ['level7.html', 'level7-module1.html', 'level7-module2.html', 'level7-module3.html',
        'level7-module4.html', 'level7-module5.html', 'level7-module6.html', 'level7-module7.html',
        'level7-module8.html', 'level7-module9.html', 'level7-module10.html', 'level7-certificate.html'],
    8: ['level8.html', 'level8-module1.html', 'level8-module2.html', 'level8-module3.html',
        'level8-module4.html', 'level8-module5.html', 'level8-module6.html', 'level8-module7.html',
        'level8-module8.html', 'level8-module9.html', 'level8-module10.html', 'level8-certificate.html'],
    9: ['level9.html', 'level9-module1.html', 'level9-module2.html', 'level9-module3.html',
        'level9-module4.html', 'level9-module5.html', 'level9-module6.html', 'level9-module7.html',
        'level9-module8.html', 'level9-module9.html', 'level9-module10.html', 'level9-certificate.html']
  };

  /* Learning content (all level pages) is open WITHOUT login, so teachers can teach with it.
     Released / locked levels are still controlled by LEVEL_ACCESS above.
     Only these student-specific pages require a STUDENT login: */
  var STUDENT_PAGES = ['student-dashboard.html', 'certificate.html', 'level2-certificate.html', 'level3-certificate.html',
                       'level4-certificate.html', 'level5-certificate.html', 'level6-certificate.html',
                       'level7-certificate.html', 'level8-certificate.html', 'level9-certificate.html'];
  /* The teacher pages are protected by a teacher login checked in Supabase (teacher-login.html) */
  var PUBLIC_PAGES = ['index.html', 'login.html', 'locked.html', 'supabase-test.html', 'teacher-dashboard.html', 'teacher-login.html'];

  function pageName() {
    var p = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    return p || 'index.html';
  }

  function levelOfPage(page) {
    for (var n in LEVEL_PAGES) {
      if (LEVEL_PAGES[n].indexOf(page) >= 0) return +n;
    }
    return 0;
  }

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function normalizeUSN(u) { return String(u || '').trim().toUpperCase(); }
  function isValidUSN(u) { return USN_PATTERN.test(normalizeUSN(u)); }

  function currentStudent() {
    try { return JSON.parse(get('studentAccount') || 'null'); } catch (e) { return null; }
  }

  function isLoggedIn() {
    var s = currentStudent();
    return get('studentLoggedIn') === 'true' && !!s && isValidUSN(s.usn);
  }

  /* checkLevelAccess("level4") or checkLevelAccess(4) → true / false (released for students?) */
  function checkLevelAccess(level) {
    var key = typeof level === 'number' ? 'level' + level : String(level).toLowerCase();
    return LEVEL_ACCESS[key] === true;
  }

  /* Teacher preview: after Teacher Login, locked levels open for that teacher in this browser
     session. Students never see locked levels. (The teacher session is re-checked with the
     server by common.js; level pages contain no student data.) */
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function teacherPreview() {
    var until = +sget('ddeTeacherPreviewUntil') || 0;
    return !!sget('ddeTeacherToken') && until > Date.now();
  }
  function canOpenLevel(level) { return checkLevelAccess(level) || teacherPreview(); }

  function hideAndGo(url) {
    // Hide the page immediately so protected content is never shown while leaving
    var st = document.createElement('style');
    st.textContent = 'html,body{visibility:hidden!important;background:#fff!important}';
    (document.head || document.documentElement).appendChild(st);
    location.replace(url);
  }

  var page = pageName();
  var level = levelOfPage(page);

  window.DDE_ACCESS = {
    LEVEL_PAGES: LEVEL_PAGES,
    page: page,
    level: level,
    levelOfPage: levelOfPage,
    isValidUSN: isValidUSN,
    normalizeUSN: normalizeUSN,
    currentStudent: currentStudent,
    isLoggedIn: isLoggedIn,
    checkLevelAccess: checkLevelAccess,
    teacherPreview: teacherPreview,
    canOpenLevel: canOpenLevel,
    STUDENT_PAGES: STUDENT_PAGES
  };
  window.checkLevelAccess = checkLevelAccess;
  window.canOpenLevel = canOpenLevel;
  window.isValidUSN = isValidUSN;

  /* ---------- The guard: runs before the page body is shown ---------- */
  if (PUBLIC_PAGES.indexOf(page) >= 0) return;

  // An old session with an invalid USN is ended here
  if (get('studentLoggedIn') === 'true' && !isLoggedIn()) { try { localStorage.removeItem('studentLoggedIn'); } catch (e) {} }

  if (STUDENT_PAGES.indexOf(page) >= 0 && !isLoggedIn()) {
    hideAndGo('login.html?next=' + encodeURIComponent(page));
    return;
  }

  if (level && !canOpenLevel(level)) {
    hideAndGo('locked.html?level=' + level);
  }
})();
