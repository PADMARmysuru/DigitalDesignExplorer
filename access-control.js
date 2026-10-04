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
  level10: false, // Physical Design (locked until you release it)
  level11: false, // Advanced Design Verification (locked until you release it)
  level12: false, // Advanced DFT & Silicon Test (locked until you release it)
  level13: false, // Processor / VLSI Architecture (locked until you release it)
  level14: false, // AI/ML for VLSI (locked until you release it)
  capstone: false // 🏆 Final Capstone (locked until you release it)
  // Part B (Levels 7–14 + Capstone) ALSO requires faculty-granted Part B access for each student:
  // Faculty Dashboard → Part B Access. That permission is checked by the server (Supabase).
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
        'level9-module8.html', 'level9-module9.html', 'level9-module10.html', 'level9-certificate.html'],
    10: ['level10.html', 'level10-module1.html', 'level10-module2.html', 'level10-module3.html',
        'level10-module4.html', 'level10-module5.html', 'level10-module6.html', 'level10-module7.html',
        'level10-module8.html', 'level10-module9.html', 'level10-module10.html', 'level10-certificate.html'],
    11: ['level11.html', 'level11-module1.html', 'level11-module2.html', 'level11-module3.html',
        'level11-module4.html', 'level11-module5.html', 'level11-module6.html', 'level11-module7.html',
        'level11-module8.html', 'level11-module9.html', 'level11-module10.html', 'level11-certificate.html'],
    12: ['level12.html', 'level12-module1.html', 'level12-module2.html', 'level12-module3.html',
        'level12-module4.html', 'level12-module5.html', 'level12-module6.html', 'level12-module7.html',
        'level12-module8.html', 'level12-module9.html', 'level12-module10.html', 'level12-certificate.html'],
    13: ['level13.html', 'level13-module1.html', 'level13-module2.html', 'level13-module3.html',
        'level13-module4.html', 'level13-module5.html', 'level13-module6.html', 'level13-module7.html',
        'level13-module8.html', 'level13-module9.html', 'level13-module10.html', 'level13-certificate.html'],
    14: ['level14.html', 'level14-module1.html', 'level14-module2.html', 'level14-module3.html',
        'level14-module4.html', 'level14-module5.html', 'level14-module6.html', 'level14-module7.html',
        'level14-module8.html', 'level14-module9.html', 'level14-module10.html', 'level14-certificate.html'],
    15: ['capstone.html', 'capstone-certificate.html']   // Final Capstone (Part B)
  };

  /* Part A learning content is open WITHOUT login, so teachers can teach with it. Part B pages
     (Levels 7–14 + Capstone) need a student with faculty-granted Part B access or a Teacher Login.
     Released / locked levels are still controlled by LEVEL_ACCESS above.
     Only these student-specific pages require a STUDENT login: */
  var STUDENT_PAGES = ['student-dashboard.html', 'certificate.html', 'level2-certificate.html', 'level3-certificate.html',
                       'level4-certificate.html', 'level5-certificate.html', 'level6-certificate.html',
                       'level7-certificate.html', 'level8-certificate.html', 'level9-certificate.html', 'level10-certificate.html',
                       'level11-certificate.html', 'level12-certificate.html',
                       'level13-certificate.html', 'level14-certificate.html', 'capstone-certificate.html'];
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
    var key = typeof level === 'number' ? (level === 15 ? 'capstone' : 'level' + level) : String(level).toLowerCase();
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

  /* ---------- Part B (Levels 7–14 + Final Capstone): faculty-granted access, checked by the SERVER ----------
     The page stays hidden until Supabase confirms that this browser's session (a student with Part B access,
     or a logged-in teacher) may see it. localStorage / sessionStorage values are never trusted on their own. */
  var PARTB_FIRST = 7, PARTB_LAST = 15;
  function isPartB(lv) { return lv >= PARTB_FIRST && lv <= PARTB_LAST; }
  /* One shared loader for supabase-config.js, used by access-control.js, common.js and progress-sync.js,
     so the file is never loaded twice (that would redeclare SUPABASE_URL). Resolves true when configured. */
  window.ddeLoadConfig = function () {
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') return Promise.resolve(true);
    if (window.__ddeCfgPromise) return window.__ddeCfgPromise;
    window.__ddeCfgPromise = new Promise(function (resolve) {
      function waitFor(n) { if (typeof SUPABASE_URL !== 'undefined') return resolve(true); if (n > 200) return resolve(false); setTimeout(function () { waitFor(n + 1); }, 25); }
      function go() {
        if (typeof SUPABASE_URL !== 'undefined') return resolve(true);
        if (document.querySelector('script[src$="supabase-config.js"]')) return waitFor(0);   // the page loads it itself
        var sc = document.createElement('script'); sc.src = 'supabase-config.js';
        sc.onload = function () { resolve(typeof SUPABASE_URL !== 'undefined'); }; sc.onerror = function () { resolve(false); };
        (document.head || document.documentElement).appendChild(sc);
      }
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
    });
    return window.__ddeCfgPromise;
  };
  function withConfig(cb, fail) { window.ddeLoadConfig().then(function (ok) { if (ok) cb(); else fail(); }); }
  function partBStatus() {                                   // → Promise {ok, role, granted} (display + guard)
    var t = sget('ddeTeacherToken'), st = get('ddeSessionToken');
    if (!t && !st) return Promise.resolve({ ok: false, error: 'not_logged_in' });
    if (t && st) return ask(t).then(function (r) { return r && r.ok ? r : ask(st); });   // stale teacher token → student session
    return ask(t || st);
  }
  function ask(tok) {
    return new Promise(function (resolve) {
      withConfig(function () {
        fetch(SUPABASE_URL + '/rest/v1/rpc/dde_partb_status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY },
          body: JSON.stringify({ p_token: tok })
        }).then(function (r) { return r.json(); }).then(resolve, function () { resolve({ ok: false, error: 'offline' }); });
      }, function () { resolve({ ok: false, error: 'offline' }); });
    });
  }
  function guardPartB(lv) {
    var st = document.createElement('style'); st.id = 'dde-partb-hide';
    st.textContent = 'html{visibility:hidden!important}';
    (document.head || document.documentElement).appendChild(st);
    partBStatus().then(function (r) {
      if (r && r.ok && r.granted) { var e = document.getElementById('dde-partb-hide'); if (e) e.parentNode.removeChild(e); return; }
      if (r && r.error === 'not_logged_in') { location.replace('login.html?partb=1&next=' + encodeURIComponent(page)); return; }
      var why = r && r.error === 'offline' ? 'offline' : (r && r.ok) ? '1' : 'setup';   // not ok and no known error = server function missing (SQL not run)
      location.replace('locked.html?partb=' + why + '&level=' + lv);
    });
  }

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
    isPartB: isPartB,
    partBStatus: partBStatus,
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
    return;
  }

  // Part B pages additionally need server-confirmed Part B access (student) or a teacher session
  if (level && isPartB(level)) guardPartB(level);
})();
