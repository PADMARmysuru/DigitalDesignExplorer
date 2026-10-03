/* =====================================================================
   Digital Design Explorer – common platform script
   Header, navigation, breadcrumbs, footer, dashboard overview,
   locked screen and certificate, shared by every page.
   Needs access-control.js to be loaded first (it holds LEVEL_ACCESS).
   Progress is READ from the existing localStorage keys – nothing is
   renamed, reset or written here except the login flag on logout.
   ===================================================================== */
(function () {
  'use strict';

  var A = window.DDE_ACCESS || {};
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function flag(k) { return get(k) === 'true'; }
  function json(k, d) { try { var v = JSON.parse(get(k)); return v == null ? d : v; } catch (e) { return d; } }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function count(n, fn) { var c = 0; for (var i = 1; i <= n; i++) if (fn(i)) c++; return c; }

  /* ---------- Level 5 / 6 store helpers (same keys as level5.js / level6-common.js) ---------- */
  function l5Passed(n) {
    if (flag('level5_module' + n + '_completed')) return true;
    var d = json('dde_level5_progress', {});
    return !!(d && d.m && d.m[n] && d.m[n].passed);
  }
  function l5LastDate() {
    var d = json('dde_level5_progress', {}), last = '';
    if (d && d.m) Object.keys(d.m).forEach(function (k) { var x = d.m[k] && d.m[k].date; if (x && x > last) last = x; });
    return last;
  }

  /* ---------- The levels: only pages that exist in the project ---------- */
  var LEVELS = [
    {
      n: 1, title: 'Digital Design Fundamentals', color: '#2f6bd2', dashboard: 'dashboard.html', certificate: 'certificate.html',
      modules: [
        ['Logic Gates', 'logic-gates.html'], ['Half Adder', 'half-adder.html'], ['Full Adder', 'full-adder.html'],
        ['K-Map', 'kmap.html'], ['Quine–McCluskey', 'quine-mccluskey.html'], ['Verilog Basics', 'verilog.html'],
        ['Digital Logic Lab', 'digital-logic-lab.html']
      ],
      quiz: [['Quiz', 'quiz.html']],
      practice: [['Verilog Practice', 'practice.html'], ['GATE Practice', 'gate.html']],
      interview: [['Interview Questions', 'interview.html'], ['Interview Test', 'interview-test.html']],
      unit: 'Modules',
      progress: function () {
        var gates = (json('completedGates', []) || []).length;
        var prog = count(10, function (i) { return get('practice' + i) === 'completed'; });
        var lab = count(8, function (i) { return flag('digitalLabExp' + i); });
        return [
          { label: 'Logic Gates (7 gates)', done: gates >= 7, href: 'logic-gates.html' },
          { label: 'Half Adder', done: flag('halfAdderCompleted'), href: 'half-adder.html' },
          { label: 'Full Adder', done: flag('fullAdderCompleted'), href: 'full-adder.html' },
          { label: 'Verilog Practice (10 programs)', done: prog >= 10, href: 'practice.html' },
          { label: 'Quiz', done: get('quizScore') !== null, href: 'quiz.html' },
          { label: 'K-Map', done: flag('kmapCompleted'), href: 'kmap.html' },
          { label: 'Quine–McCluskey practice', done: flag('qmPracticeCompleted'), href: 'quine-mccluskey.html' },
          { label: 'Digital Logic Lab (8 experiments)', done: lab >= 8, href: 'digital-logic-lab.html' }
        ];
      }
    },
    {
      n: 2, title: 'Digital Circuit Design', color: '#0f8b8d', dashboard: 'level2-dashboard.html', certificate: 'level2-certificate.html',
      modules: [
        ['Gate-Level Realization', 'gate-realization.html'], ['Sequential Circuits', 'sequential-circuits.html'],
        ['Counters', 'counters.html'], ['Registers', 'registers.html'], ['State Machines', 'state-machines.html']
      ],
      practice: [['Sequential Circuits – 20 Problems', 'sequential-circuits-20-problems.html']],
      unit: 'Activities',
      progress: function () {
        return [
          { label: 'Gate-Level Realization (20 problems)', done: (json('completedGateProblems', []) || []).length >= 20, href: 'gate-realization.html' },
          { label: 'Sequential Circuits challenge', done: flag('sequentialChallengeDone'), href: 'sequential-circuits.html' },
          { label: 'Sequential Circuits – 20 problems', done: flag('sequentialCircuitsDone'), href: 'sequential-circuits-20-problems.html' },
          { label: 'Counters', done: flag('counterActivityDone'), href: 'counters.html' },
          { label: 'Registers', done: flag('registerActivityDone'), href: 'registers.html' },
          { label: 'State Machines', done: flag('stateMachineActivityDone'), href: 'state-machines.html' }
        ];
      }
    },
    {
      n: 3, title: 'Verilog for Beginners', color: '#6c4fd1', dashboard: 'level3-dashboard.html', certificate: 'level3-certificate.html',
      modules: [
        ['Verilog Basics', 'verilog-basics.html'], ['Structural Modeling', 'verilog-structural.html'],
        ['Data-Flow Modeling', 'verilog-dataflow.html'], ['Behavioral Modeling', 'verilog-behavioral.html'],
        ['RTL Modeling', 'verilog-rtl.html'], ['Testbench & Verification', 'verilog-testbench-verification.html']
      ],
      interview: [['Interview Questions', 'interview.html'], ['Interview Test', 'interview-test.html']],
      unit: 'Activities',
      progress: function () {
        var k = [['Verilog Basics', 'verilogBasicsDone', 'verilog-basics.html'], ['Structural Modeling', 'verilogStructuralDone', 'verilog-structural.html'],
          ['Data-Flow Modeling', 'verilogDataflowDone', 'verilog-dataflow.html'], ['Behavioral Modeling', 'verilogBehavioralDone', 'verilog-behavioral.html'],
          ['RTL Modeling', 'verilogRTLDone', 'verilog-rtl.html'], ['Testbench & Verification', 'verilogVerificationDone', 'verilog-testbench-verification.html']];
        return k.map(function (x) { return { label: x[0], done: flag(x[1]), href: x[2] }; });
      }
    },
    {
      n: 4, title: 'VLSI Basics', color: '#c2570c', dashboard: 'level4-dashboard.html', certificate: 'level4-certificate.html',
      modules: [
        ['VLSI Foundations & the MOSFET', 'level4-module1.html'], ['MOSFET Fundamentals', 'level4-module2.html'],
        ['CMOS Logic & Transistor-Level Design', 'level4-module3.html'], ['MOSFET Characteristics & CMOS Inverter', 'level4-module4.html'],
        ['Layout & Stick Diagrams', 'level4-module5.html'], ['Fabrication', 'level4-module6.html'],
        ['Scaling', 'level4-module7.html'], ['Advanced CMOS Logic Styles', 'level4-module8.html']
      ],
      unit: 'Modules', numbered: true,
      progress: function () {
        return LEVELS[3].modules.map(function (m, i) { return { label: 'Module ' + (i + 1) + ': ' + m[0], done: flag('vlsiL4M' + (i + 1) + 'Done'), href: m[1] }; });
      }
    },
    {
      n: 5, title: 'VLSI Testing', color: '#b7791f', dashboard: 'level5-dashboard.html', certificate: 'level5-certificate.html',
      modules: [
        ['Introduction to VLSI Testing', 'level5-module1.html'], ['Fault Models', 'level5-module2.html'],
        ['Fault Simulation and Fault Coverage', 'level5-module3.html'], ['Test Pattern Generation (ATPG)', 'level5-module4.html'],
        ['Design for Testability and Scan', 'level5-module5.html'], ['BIST and Boundary Scan', 'level5-module6.html']
      ],
      unit: 'Modules', numbered: true,
      progress: function () {
        return LEVELS[4].modules.map(function (m, i) { return { label: 'Module ' + (i + 1) + ': ' + m[0] + ' (pass the quiz)', done: l5Passed(i + 1), href: m[1] + '#quiz' }; });
      }
    },
    {
      n: 6, title: 'SystemVerilog', color: '#0b7a83', dashboard: 'level6.html', certificate: 'level6-certificate.html',
      modules: [
        ['SystemVerilog Fundamentals', 'level6-module1.html'], ['Procedural SystemVerilog', 'level6-module2.html'],
        ['Arrays & Data Structures', 'level6-module3.html'], ['Functions & Tasks', 'level6-module4.html'],
        ['Object-Oriented SystemVerilog', 'level6-module5.html'], ['Interfaces', 'level6-module6.html'],
        ['Assertions (SVA)', 'level6-module7.html'], ['Constrained Randomization', 'level6-module8.html'],
        ['Testbench Architecture', 'level6-module9.html'], ['Verification Components', 'level6-module10.html'],
        ['Functional Coverage', 'level6-module11.html'], ['Verification Projects', 'level6-module12.html']
      ],
      unit: 'Modules', numbered: true,
      progress: function () {
        return LEVELS[5].modules.map(function (m, i) { return { label: 'Module ' + (i + 1) + ': ' + m[0], done: flag('level6_module' + (i + 1) + '_completed'), href: m[1] }; });
      }
    }
  ];

  /* Part B – Advanced VLSI & Digital IC Design.
     Levels 7 and 8 have pages (released through LEVEL_ACCESS.level7 / level8 in access-control.js).
     Levels 9–14 are ROADMAP ONLY: no pages yet, always shown as locked / coming soon. */
  var LEVELS_B = [
    {
      n: 7, part: 'B', title: 'Digital VLSI Design', color: '#16b5c9', dashboard: 'level7.html', certificate: 'level7-certificate.html',
      modules: [
        ['Advanced CMOS Logic Design', 'level7-module1.html'], ['VLSI Arithmetic Circuit Design', 'level7-module2.html'],
        ['Datapath Circuit Design', 'level7-module3.html'], ['VLSI Memory Circuits', 'level7-module4.html'],
        ['VLSI Interconnect', 'level7-module5.html'], ['Standard Cell Design', 'level7-module6.html'],
        ['IP-Based VLSI Design', 'level7-module7.html'], ['VLSI Design for Reliability', 'level7-module8.html'],
        ['Emerging Digital VLSI Technologies', 'level7-module9.html'], ['Digital VLSI Mini Project', 'level7-module10.html']
      ],
      unit: 'Modules', numbered: true,
      progress: function () {
        return LEVELS_B[0].modules.map(function (m, i) { return { label: 'Module ' + (i + 1) + ': ' + m[0] + ' (activities + quiz)', done: flag('level7_module' + (i + 1) + '_completed'), href: m[1] }; });
      }
    },
    {
      n: 8, part: 'B', title: 'VLSI Timing & Power', color: '#5856d6', dashboard: 'level8.html', certificate: 'level8-certificate.html',
      modules: [
        ['Digital Circuit Timing Fundamentals', 'level8-module1.html'], ['CMOS Delay Analysis', 'level8-module2.html'],
        ['Setup, Hold & Timing Constraints', 'level8-module3.html'], ['Clock Timing', 'level8-module4.html'],
        ['Static Timing Analysis (STA)', 'level8-module5.html'], ['Timing Optimization', 'level8-module6.html'],
        ['VLSI Power Fundamentals', 'level8-module7.html'], ['Low-Power VLSI Techniques', 'level8-module8.html'],
        ['Power Analysis & Optimization', 'level8-module9.html'], ['Timing & Power Case Study', 'level8-module10.html']
      ],
      unit: 'Modules', numbered: true,
      progress: function () {
        return LEVELS_B[1].modules.map(function (m, i) { return { label: 'Module ' + (i + 1) + ': ' + m[0] + ' (activities + quiz)', done: flag('level8_module' + (i + 1) + '_completed'), href: m[1] }; });
      }
    }
  ];
  function levelByN(n) {
    n = +n;
    if (n >= 1 && n <= LEVELS.length) return LEVELS[n - 1];
    for (var i = 0; i < LEVELS_B.length; i++) if (LEVELS_B[i].n === n) return LEVELS_B[i];
    return null;
  }
  var PART_B = [
    [7, 'Digital VLSI Design', 'Advanced digital VLSI design, circuit architectures and emerging technologies.'],
    [8, 'VLSI Timing & Power', 'Timing behavior, timing analysis and power-related concepts in VLSI circuits.'],
    [9, 'RTL Design & Synthesis', 'Advanced RTL design and synthesis methodologies.'],
    [10, 'Physical Design', 'Physical implementation of digital VLSI designs.'],
    [11, 'Advanced Verification', 'Advanced verification strategies and methodologies.'],
    [12, 'DFT & Advanced Testing', 'Design-for-test and advanced VLSI testing techniques.'],
    [13, 'Processor / VLSI Architecture', 'Pipelining, hazards, branch prediction, speculation, cache and processor architecture.'],
    [14, 'AI/ML for VLSI', 'Applications of artificial intelligence and machine learning in VLSI and EDA.']
  ];

  function isOpen(n) { return A.canOpenLevel ? A.canOpenLevel(n) : (A.checkLevelAccess ? A.checkLevelAccess(n) : false); }

  /* ---------- Teacher preview of locked levels ---------- */
  function endPreview() {
    try { sessionStorage.removeItem('ddeTeacherPreviewUntil'); } catch (e) {}
  }
  window.DDE_endPreview = endPreview;
  function previewBanner(L) {
    var b = document.createElement('div');
    b.className = 'dde-preview';
    b.setAttribute('role', 'status');
    b.innerHTML = '<span>👩‍🏫 <b>Teacher preview</b> – Level ' + L.n + ' is locked for students.</span>' +
      '<button type="button">End preview</button>';
    b.querySelector('button').addEventListener('click', function () { endPreview(); location.replace('locked.html?level=' + L.n); });
    return b;
  }
  /* The teacher session is confirmed with the server; a fake or expired one ends the preview */
  function confirmPreview(L) {
    var check = function () {
      var t; try { t = sessionStorage.getItem('ddeTeacherToken'); } catch (e) { t = null; }
      if (typeof SUPABASE_URL === 'undefined' || !t) return;
      fetch(SUPABASE_URL + '/rest/v1/rpc/dde_teacher_me', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + SUPABASE_ANON_KEY },
        body: JSON.stringify({ p_token: t })
      }).then(function (r) { return r.json(); }).then(function (r) {
        if (!r || !r.ok) {
          endPreview();
          try { sessionStorage.removeItem('ddeTeacherToken'); } catch (e) {}
          location.replace('locked.html?level=' + L.n);
        }
      }).catch(function () { /* offline: keep the preview */ });
    };
    if (typeof SUPABASE_URL !== 'undefined') return check();
    var s = document.createElement('script'); s.src = 'supabase-config.js'; s.onload = check;
    document.head.appendChild(s);
  }
  function levelStats(L) {
    var items = L.progress(), done = items.filter(function (x) { return x.done; }).length;
    return { items: items, done: done, total: items.length, pct: items.length ? Math.round(100 * done / items.length) : 0 };
  }
  function student() { return A.currentStudent ? A.currentStudent() : null; }

  var DDE = window.DDE = { PART_B: PART_B, LEVELS: LEVELS, LEVELS_B: LEVELS_B, levelByN: levelByN, levelStats: levelStats, isOpen: isOpen, student: student };

  /* ---------- Small SVG pieces ---------- */
  var LOGO = '<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><rect x="5" y="5" width="16" height="16" rx="3" fill="none" stroke="#c9a227" stroke-width="2"/>' +
    '<path d="M9 1v4M13 1v4M17 1v4M9 21v4M13 21v4M17 21v4M1 9h4M1 13h4M1 17h4M21 9h4M21 13h4M21 17h4" stroke="#c9a227" stroke-width="1.6"/>' +
    '<path d="M9.5 15.5v-5h3a2.5 2.5 0 010 5z" fill="#fff"/></svg>';

  function pageTitleFor(page, L) {
    if (!L) return '';
    var lists = [['modules', 'Module'], ['quiz', ''], ['practice', ''], ['interview', '']];
    for (var i = 0; i < lists.length; i++) {
      var arr = L[lists[i][0]] || [];
      for (var j = 0; j < arr.length; j++) if (arr[j][1] === page) return { kind: lists[i][0], idx: j, title: arr[j][0] };
    }
    if (page === L.certificate) return { kind: 'certificate', title: 'Certificate' };
    if (page === L.dashboard) return { kind: 'dashboard', title: 'Level ' + L.n + ' Dashboard' };
    return null;
  }

  /* ---------- Header + navigation ---------- */
  function menu(label, items, page, extraClass) {
    var cur = items.some(function (x) { return x[1] === page; });
    return '<details class="dde-dd' + (cur ? ' is-current' : '') + (extraClass ? ' ' + extraClass : '') + '"><summary>' + label + '</summary><div class="dde-menu">' +
      items.map(function (x, i) {
        return '<a href="' + x[1] + '"' + (x[1] === page ? ' class="is-current" aria-current="page"' : '') + '>' + (x[2] ? '<span class="dde-num">' + x[2] + '</span>' : '') + esc(x[0]) + '</a>';
      }).join('') + '</div></details>';
  }

  function buildHeader(page, L) {
    var st = student(), logged = A.isLoggedIn && A.isLoggedIn();
    var h = '<div class="dde-header" id="dde-header" role="banner">' +
      '<div class="dde-brandbar"><a class="dde-brand" href="index.html"><span class="dde-logo">' + LOGO + '</span>' +
      '<span class="dde-brand-text"><strong>Digital Design Explorer</strong><small>Interactive Learning Platform for Digital Design, Verilog, VLSI &amp; SystemVerilog</small></span></a>' +
      (logged && st ? '<div class="dde-user"><b>' + esc(st.name || 'Student') + '</b>' + esc(A.normalizeUSN(st.usn)) + '</div>' : '') +
      '<button type="button" class="dde-burger" aria-expanded="false" aria-controls="dde-navbar">☰ Menu</button></div>' +
      '<div class="dde-navbar" id="dde-navbar"><div class="dde-nav" role="navigation" aria-label="Main navigation">';
    h += '<a href="index.html"' + (page === 'index.html' ? ' class="is-current" aria-current="page"' : '') + '>🏠 Home</a>';
    h += '<a href="student-dashboard.html"' + (page === 'student-dashboard.html' ? ' class="is-current" aria-current="page"' : '') + '>📊 Dashboard</a>';
    // All levels
    h += '<details class="dde-dd"><summary>📚 Levels</summary><div class="dde-menu"><span class="dde-menu-head">Part A — Foundations</span>' + LEVELS.map(function (x) {
      return isOpen(x.n)
        ? '<a href="' + x.dashboard + '"' + (L && L.n === x.n ? ' class="is-current"' : '') + '><span class="dde-num">' + x.n + '</span>🟢 ' + esc(x.title) + '</a>'
        : '<span class="is-locked" title="Not yet released"><span class="dde-num">' + x.n + '</span>🔒 ' + esc(x.title) + '</span>';
    }).join('') + '<hr><span class="dde-menu-head">Part B — Advanced VLSI</span>' + PART_B.map(function (x) {
      var B = levelByN(x[0]);
      if (B && isOpen(B.n)) return '<a href="' + B.dashboard + '"' + (L && L.n === B.n ? ' class="is-current"' : '') + '><span class="dde-num">' + x[0] + '</span>🟢 ' + esc(x[1]) + '</a>';
      if (B) return '<span class="is-locked" title="Not yet released"><span class="dde-num">' + x[0] + '</span>🔒 ' + esc(x[1]) + '</span>';
      return '<span class="is-locked" title="Coming soon"><span class="dde-num">' + x[0] + '</span>🔒 ' + esc(x[1]) + ' <em class="dde-soon">Coming soon</em></span>';
    }).join('') + '</div></details>';
    // Current level menu
    var mp = page;
    if (L && isOpen(L.n)) {
      h += '<span class="dde-levelname">Level ' + L.n + '</span>';
      var mods = [[(L.n === 6 ? 'Level 6 overview' : 'Level ' + L.n + ' dashboard'), L.dashboard]].concat(
        L.modules.map(function (m, i) { return [L.numbered ? m[0] : m[0], m[1], L.numbered ? i + 1 : '']; }));
      h += menu('📚 ' + (L.unit === 'Activities' ? 'Activities' : 'Modules'), mods, mp);
      if (L.quiz) h += L.quiz.length === 1 ? '<a href="' + L.quiz[0][1] + '"' + (page === L.quiz[0][1] ? ' class="is-current" aria-current="page"' : '') + '>📝 Quiz</a>' : menu('📝 Quiz', L.quiz, page);
      if (L.practice) h += menu('🎯 Practice', L.practice, page);
      if (L.interview) h += menu('🎤 Interview', L.interview, page);
      h += '<a href="' + L.certificate + '"' + (page === L.certificate ? ' class="is-current" aria-current="page"' : '') + '>🏆 Certificate</a>';
    }
    h += '<span class="dde-sep"></span>';
    h += '<a href="teacher-dashboard.html"' + (page === 'teacher-dashboard.html' || page === 'teacher-login.html' ? ' class="is-current" aria-current="page"' : '') + '>👩‍🏫 Teacher Dashboard 🔐</a>';
    h += logged ? '<a href="#" data-dde-logout>🚪 Logout</a>' : '<a href="login.html"' + (page === 'login.html' ? ' class="is-current"' : '') + '>🔐 Student Login</a>';
    h += '</div></div></div>';
    return h;
  }

  function buildCrumbs(page, L) {
    var c = ['<li><a href="index.html">Home</a></li>'];
    if (page === 'student-dashboard.html') c.push('<li><span aria-current="page">Dashboard</span></li>');
    else if (L) {
      var t = pageTitleFor(page, L);
      if (t && t.kind === 'dashboard') c.push('<li><span aria-current="page">Level ' + L.n + ': ' + esc(L.title) + '</span></li>');
      else {
        c.push('<li><a href="' + L.dashboard + '">Level ' + L.n + ': ' + esc(L.title) + '</a></li>');
        if (t && t.kind === 'modules' && L.numbered) c.push('<li>Module ' + (t.idx + 1) + '</li>');
        if (t) c.push('<li><span aria-current="page">' + esc(t.title) + '</span></li>');
        else c.push('<li><span aria-current="page">' + esc(document.title.split('|')[0].split('–')[0].trim()) + '</span></li>');
      }
    } else if (page === 'locked.html') c.push('<li><span aria-current="page">Locked level</span></li>');
    else if (page === 'login.html') c.push('<li><span aria-current="page">Login</span></li>');
    else return '';
    return '<div class="dde-crumbs" role="navigation" aria-label="Breadcrumb"><ol>' + c.join('') + '</ol></div>';
  }

  function buildFooter() {
    return '<div class="dde-footer" id="dde-footer" role="contentinfo"><div class="dde-footer-in">' +
      '<div><h3>Mrs. Padma R</h3><p class="dde-role">Assistant Professor</p>' +
      '<p>Department of Electronics and Communication Engineering (ECE)</p><p>GSSSIETW, Mysuru</p>' +
      '<p class="dde-footer-brand">Digital Design Explorer</p></div>' +
      '<div class="dde-contact"><a href="mailto:padmar@gsss.edu.in">📧 padmar@gsss.edu.in</a></div>' +
      '</div><div class="dde-footer-bottom">© 2026 Digital Design Explorer. All Rights Reserved.</div></div>';
  }

  /* Hide the page's own site header / nav / footer (kept in the DOM for its scripts) */
  function hideOldChrome() {
    Array.prototype.forEach.call(document.body.children, function (el) {
      if (el.id === 'dde-header' || el.id === 'dde-footer' || el.classList.contains('dde-crumbs')) return;
      var tag = el.tagName;
      if (tag === 'NAV' || tag === 'FOOTER') el.classList.add('dde-old-chrome');
      if (tag === 'HEADER' && !el.classList.contains('topbar') && !el.classList.contains('l6-topbar')) {
        var t = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (/^(🎓\s*)?Digital Design Explorer/.test(t)) el.classList.add('dde-old-chrome');
      }
    });
  }

  /* Make header/footer full-width even when the page's body has padding */
  function bleed(el) {
    var cs = getComputedStyle(document.body);
    var l = parseFloat(cs.paddingLeft) || 0, r = parseFloat(cs.paddingRight) || 0;
    if (l || r) { el.style.marginLeft = -l + 'px'; el.style.marginRight = -r + 'px'; }
  }

  function logout() {
    try { localStorage.removeItem('studentLoggedIn'); } catch (e) {}
    var go = function () { location.href = 'login.html'; };
    if (window.DDEProgress) { DDEProgress.logout().then(go, go); setTimeout(go, 1500); }
    else { try { localStorage.removeItem('ddeSessionToken'); } catch (e) {} go(); }
  }
  DDE.logout = logout;

  function mountChrome() {
    var page = A.page || 'index.html', L = A.level ? levelByN(A.level) : null;
    if (page === 'locked.html') {
      var q = parseInt(new URLSearchParams(location.search).get('level'), 10);
      if (q >= 1 && q <= 7) L = null;
    }
    var b = document.body;
    b.classList.add('dde-on');
    if (L) b.classList.add('dde-l' + L.n);
    hideOldChrome();
    var top = document.createElement('div');
    top.innerHTML = buildHeader(page, L) + buildCrumbs(page, L);
    var first = b.firstChild;
    while (top.firstChild) { var n = top.firstChild; b.insertBefore(n, first); }
    if (L && A.checkLevelAccess && !A.checkLevelAccess(L.n) && A.teacherPreview && A.teacherPreview()) {
      b.insertBefore(previewBanner(L), first);
      confirmPreview(L);
    }
    var f = document.createElement('div');
    f.innerHTML = buildFooter();
    b.appendChild(f.firstChild);
    var hdr = document.getElementById('dde-header'), ft = document.getElementById('dde-footer'), cr = document.querySelector('.dde-crumbs');
    var cs = getComputedStyle(b);
    [hdr, cr, ft].forEach(function (el) { if (el) bleed(el); });
    var pt = parseFloat(cs.paddingTop) || 0, mt = parseFloat(cs.marginTop) || 0;
    if (pt) hdr.style.marginTop = -pt + 'px'; else if (mt) hdr.style.marginTop = -mt + 'px';
    var pb = parseFloat(cs.paddingBottom) || 0;
    if (pb) ft.style.marginBottom = -pb + 'px';

    // Mobile menu
    var burger = hdr.querySelector('.dde-burger');
    burger.addEventListener('click', function () {
      var open = hdr.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.textContent = open ? '✕ Close' : '☰ Menu';
    });
    // Only one dropdown open at a time; close on outside click / Escape
    var dds = hdr.querySelectorAll('.dde-dd');
    Array.prototype.forEach.call(dds, function (d) {
      d.addEventListener('toggle', function () { if (d.open) Array.prototype.forEach.call(dds, function (o) { if (o !== d) o.open = false; }); });
    });
    document.addEventListener('click', function (e) { if (!hdr.contains(e.target)) Array.prototype.forEach.call(dds, function (d) { d.open = false; }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') Array.prototype.forEach.call(dds, function (d) { d.open = false; }); });
    var lo = hdr.querySelector('[data-dde-logout]');
    if (lo) lo.addEventListener('click', function (e) { e.preventDefault(); logout(); });
  }

  /* ---------- Dashboard overview (profile, overall progress, levels) ---------- */
  function renderOverview(root) {
    var st = student() || {};
    var open = LEVELS.concat(LEVELS_B).filter(function (L) { return isOpen(L.n); });
    var tot = 0, done = 0, finished = 0;
    open.forEach(function (L) { var s = levelStats(L); tot += s.total; done += s.done; if (s.done === s.total) finished++; });
    var pct = tot ? Math.round(100 * done / tot) : 0;
    var initials = String(st.name || 'S').trim().split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
    var C = 2 * Math.PI * 48;
    var html = '<div class="dde-top">' +
      '<section class="dde-card dde-profile" aria-labelledby="ddeProfileH"><h2 id="ddeProfileH">👩‍🎓 Student Profile</h2>' +
      '<div class="dde-profile-head"><span class="dde-avatar" aria-hidden="true">' + esc(initials) + '</span><div><strong>' + esc(st.name || '—') + '</strong><span>' + esc(A.normalizeUSN ? A.normalizeUSN(st.usn) : st.usn) + '</span></div></div>' +
      '<dl class="dde-facts">' +
      [['Branch', st.branch], ['Semester', st.semester], ['Section', st.section], ['Email', st.email]].map(function (f) {
        return '<div><dt>' + f[0] + '</dt><dd>' + esc(f[1] || '—') + '</dd></div>';
      }).join('') + '</dl></section>' +
      '<section class="dde-card dde-overall" aria-labelledby="ddeOverallH"><h2 id="ddeOverallH">📈 Overall Progress</h2><div class="dde-overall-row">' +
      '<svg class="dde-ring" viewBox="0 0 120 120" role="img" aria-label="' + pct + ' percent complete"><circle class="bg" cx="60" cy="60" r="48"/>' +
      '<circle class="fg" cx="60" cy="60" r="48" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - pct / 100)).toFixed(1) + '"/>' +
      '<text x="60" y="68" text-anchor="middle">' + pct + '%</text></svg>' +
      '<div><p><b>' + done + ' of ' + tot + '</b> learning items completed</p><p>across the <b>' + open.length + '</b> released level' + (open.length === 1 ? '' : 's') + '</p>' +
      '<p><b>' + finished + '</b> level' + (finished === 1 ? '' : 's') + ' fully completed</p></div></div></section></div>';
    var doneLevels = LEVELS.filter(function (L) { if (!isOpen(L.n)) return false; var s = levelStats(L); return s.done === s.total; }).length;
    html += '<h2 class="dde-h2">📚 My Learning Levels</h2>' +
      '<div class="dde-part dde-part-a"><span class="dde-part-badge">PART A</span><div><h3>Foundations</h3>' +
      '<p>Build strong foundations in digital logic, digital circuits, Verilog, VLSI and SystemVerilog.</p>' +
      '<span class="dde-part-meta">Levels 1–6 · ' + doneLevels + ' of 6 completed</span></div></div><div class="dde-levels">';
    LEVELS.forEach(function (L) {
      var o = isOpen(L.n), s = o ? levelStats(L) : null, full = s && s.done === s.total;
      html += '<article class="dde-card dde-level' + (o ? '' : ' is-locked') + '" style="--lvl:' + (o ? L.color : '#9aa3b2') + '">' +
        '<div class="dde-level-top"><div><span class="dde-level-num">Level ' + L.n + '</span><h3>' + esc(L.title) + '</h3></div>' +
        (o ? (full ? '<span class="dde-pill is-done">🏆 Completed</span>' : '<span class="dde-pill is-open">🟢 Available</span>') : '<span class="dde-pill is-locked">🔒 Locked</span>') + '</div>';
      if (o) {
        html += '<div class="dde-bar' + (full ? ' is-full' : '') + '"><span style="width:' + s.pct + '%"></span></div>' +
          '<div class="dde-level-meta"><span>Progress: <b>' + s.pct + '%</b></span><span>Completed ' + L.unit + ': <b>' + s.done + '/' + s.total + '</b></span></div>' +
          '<div class="dde-level-actions"><a class="dde-btn" href="' + L.dashboard + '">' + (s.done ? 'Continue Learning →' : 'Start Learning →') + '</a>' +
          (full ? '<a class="dde-btn is-gold" href="' + L.certificate + '">🏆 Certificate</a>' : '') + '</div>';
      } else {
        html += '<p class="dde-level-note">This level has not been released yet. It will open when your instructor releases it.</p>' +
          '<div class="dde-level-actions"><button type="button" class="dde-btn" disabled aria-disabled="true">🔒 Locked</button></div>';
      }
      html += '</article>';
    });
    html += '</div>';
    html += '<div class="dde-part dde-part-b"><span class="dde-part-badge">PART B</span><div><h3>Advanced VLSI &amp; Digital IC Design</h3>' +
      '<p>The advanced track: digital VLSI design, timing and power, synthesis, physical design, verification, DFT, processor architecture and AI/ML for VLSI.</p>' +
      '<span class="dde-part-meta">Levels 7–14 · Level 7 ' + (isOpen(7) ? '🟢 available' : '🔒 locked') + ' · Level 8 ' + (isOpen(8) ? '🟢 available' : '🔒 locked') + ' · ⏳ Levels 9–14 coming soon</span></div></div><div class="dde-levels dde-levels-b">';
    PART_B.forEach(function (x) {
      var B = levelByN(x[0]);
      if (B) {
        var bo = isOpen(B.n), bs = bo ? levelStats(B) : null, bf = bs && bs.done === bs.total;
        html += '<article class="dde-card dde-level' + (bo ? '' : ' is-locked') + '" style="--lvl:' + (bo ? B.color : '#9aa3b2') + '">' +
          '<div class="dde-level-top"><div><span class="dde-level-num">Level ' + B.n + '</span><h3>' + esc(B.title) + '</h3></div>' +
          (bo ? (bf ? '<span class="dde-pill is-done">🏆 Completed</span>' : '<span class="dde-pill is-open">🟢 Available</span>') : '<span class="dde-pill is-locked">🔒 Locked</span>') + '</div>';
        if (bo) {
          html += '<div class="dde-bar' + (bf ? ' is-full' : '') + '"><span style="width:' + bs.pct + '%"></span></div>' +
            '<div class="dde-level-meta"><span>Progress: <b>' + bs.pct + '%</b></span><span>Completed ' + B.unit + ': <b>' + bs.done + '/' + bs.total + '</b></span></div>' +
            '<div class="dde-level-actions"><a class="dde-btn" href="' + B.dashboard + '">' + (bs.done ? 'Continue Learning →' : 'Start Learning →') + '</a>' +
            (bf ? '<a class="dde-btn is-gold" href="' + B.certificate + '">🏆 Certificate</a>' : '') + '</div>';
        } else {
          html += '<p class="dde-level-note">' + esc(x[2]) + ' This level will open when your instructor releases it.</p>' +
            '<div class="dde-level-actions"><button type="button" class="dde-btn" disabled aria-disabled="true">🔒 Locked</button></div>';
        }
        html += '</article>';
        return;
      }
      html += '<article class="dde-card dde-level dde-roadmap"><div class="dde-level-top"><div><span class="dde-level-num">🔒 Level ' + x[0] + '</span><h3>' + esc(x[1]) + '</h3></div>' +
        '<span class="dde-pill is-locked">🔒 Locked</span></div><p class="dde-level-note">' + esc(x[2]) + '</p>' +
        '<div class="dde-level-actions"><span class="dde-soonbar">⏳ Coming Soon</span></div></article>';
    });
    html += '</div>';
    root.innerHTML = html;
  }
  DDE.renderOverview = renderOverview;

  /* ---------- Locked level page ---------- */
  function renderLocked(root) {
    var n = parseInt(new URLSearchParams(location.search).get('level'), 10);
    var L = levelByN(n);
    if (L && isOpen(n)) { location.replace(L.dashboard); return; }
    root.innerHTML = '<div class="dde-card dde-locked" role="alert"><div class="dde-big" aria-hidden="true">🔒</div>' +
      '<h1>' + (L ? 'Level ' + n + ' is currently locked' : 'This level is currently locked') + '</h1>' +
      (L ? '<p><b>Level ' + n + ' – ' + esc(L.title) + '</b></p>' : '') +
      '<p>This level will be available when it is released by the instructor.</p>' +
      '<div class="dde-actions"><a class="dde-btn" href="student-dashboard.html">📊 Return to Dashboard</a><a class="dde-btn is-ghost" href="index.html">🏠 Home</a></div>' +
      (L ? '<p style="margin-top:16px;font-size:.9rem">Teacher? <a href="teacher-login.html?next=' + encodeURIComponent(L.dashboard) + '">Log in to preview this level</a>.</p>' : '') + '</div>';
  }
  DDE.renderLocked = renderLocked;

  /* ---------- Certificate ---------- */
  function fnv(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ('00000000' + (h >>> 0).toString(16).toUpperCase()).slice(-8); }
  function instructorFor(n, section) {
    // Level 1 keeps its existing section-wise instructor rule
    if (n === 1) {
      var s = String(section || '').trim().toUpperCase();
      if (s === 'A') return 'Mrs. Lalitha K';
      if (s === 'B') return 'Dr. Manjula G';
    }
    return 'Mrs. Padma R';
  }
  var DESCRIPTIONS = {
    1: 'covering logic gates, adders, Karnaugh maps, Quine–McCluskey minimisation, Verilog practice and the digital logic laboratory',
    2: 'covering gate-level realization, sequential circuits, counters, registers and finite state machines',
    3: 'covering Verilog basics, structural, data-flow, behavioral and RTL modeling, and testbench-based verification',
    4: 'covering MOSFET operation, CMOS logic design, inverter analysis, layout, fabrication, scaling and advanced logic styles',
    5: 'covering fault models, fault simulation, test pattern generation, design for testability, scan, BIST and boundary scan',
    6: 'covering SystemVerilog design constructs, object-oriented programming, assertions, constrained randomization, functional coverage and layered testbenches',
    7: 'covering advanced CMOS logic, VLSI arithmetic circuits, datapaths, memory circuits, interconnect, standard cells, IP-based design, reliability and emerging VLSI technologies',
    8: 'covering timing fundamentals, CMOS delay analysis, setup and hold constraints, clock timing, static timing analysis, timing optimization, VLSI power, low-power techniques and power analysis'
  };

  function corner(tf) {
    return '<svg class="dde-cert-corner" viewBox="0 0 80 80" style="' + tf + '" aria-hidden="true"><g fill="none" stroke="#c9a227" stroke-width="1.6">' +
      '<path d="M6 40V6h34"/><path d="M14 40V14h26"/><circle cx="14" cy="14" r="4" fill="#162746" stroke="none"/><path d="M22 22h10v10h-10z" stroke="#162746"/></g></svg>';
  }
  var SEAL = '<svg class="dde-cert-seal" viewBox="0 0 120 120" aria-hidden="true"><defs><path id="ddeSealArc" d="M60,60 m-41,0 a41,41 0 1,1 82,0 a41,41 0 1,1 -82,0"/></defs>' +
    '<circle cx="60" cy="60" r="56" fill="#162746"/><circle cx="60" cy="60" r="50" fill="none" stroke="#c9a227" stroke-width="2"/><circle cx="60" cy="60" r="33" fill="none" stroke="#c9a227" stroke-width="1"/>' +
    '<text font-family="Segoe UI,Arial" font-size="9.2" font-weight="700" letter-spacing="2.4" fill="#c9a227"><textPath href="#ddeSealArc">DIGITAL DESIGN EXPLORER • GSSSIETW •</textPath></text>' +
    '<text x="60" y="58" text-anchor="middle" font-family="Georgia,serif" font-size="13" font-weight="700" fill="#fff">ECE</text>' +
    '<text x="60" y="74" text-anchor="middle" font-family="Georgia,serif" font-size="11" fill="#c9a227">2026</text></svg>';

  function renderCertificate(root, n) {
    var L = levelByN(n), s = levelStats(L), st = student() || {};
    document.body.classList.add('dde-certpage');
    if (s.done < s.total) {
      root.innerHTML = '<div class="dde-wrap"><div class="dde-card dde-locked" role="alert"><div class="dde-big" aria-hidden="true">🔒</div>' +
        '<h1>Certificate Locked</h1><p>Complete all required learning ' + L.unit.toLowerCase() + ' to unlock your certificate.</p>' +
        '<p><b>Level ' + n + ' – ' + esc(L.title) + ':</b> ' + s.done + ' of ' + s.total + ' completed</p>' +
        '<ul class="dde-req">' + s.items.map(function (x) {
          return '<li class="' + (x.done ? 'is-done' : 'is-todo') + '"><b aria-hidden="true">' + (x.done ? '✓' : '') + '</b><span>' + esc(x.label) +
            '<span class="dde-hidden"> – ' + (x.done ? 'completed' : 'not completed') + '</span></span>' + (x.done ? '' : '<a href="' + x.href + '">Open</a>') + '</li>';
        }).join('') + '</ul><div class="dde-actions"><a class="dde-btn" href="' + L.dashboard + '">Go to Level ' + n + ' dashboard</a><a class="dde-btn is-ghost" href="student-dashboard.html">📊 Dashboard</a></div></div></div>';
      return;
    }
    var name = String(st.name || '').trim() || 'Student Name';
    var usn = A.normalizeUSN(st.usn) || '';
    var dateRaw = n === 5 ? (l5LastDate() || '') : '';
    var dt = dateRaw ? new Date(dateRaw) : new Date();
    if (isNaN(dt)) dt = new Date();
    var date = dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    // Level 5 keeps the ID formula it already used; other levels use the same method
    var cid = 'DDE-L' + n + '-' + (n === 5 ? fnv(name.toUpperCase() + '|' + usn + '|' + dateRaw) : fnv(name.toUpperCase() + '|' + usn + '|L' + n));
    var instructor = instructorFor(n, st.section);
    root.innerHTML =
      '<div class="dde-cert-page">' +
      '<div class="dde-cert-bar"><div class="dde-cert-status">🏆 Certificate Available<small>You have completed every requirement of Level ' + n + '. Print it or save it as a PDF.</small></div>' +
      '<button type="button" class="dde-btn is-gold" id="ddePrint">🖨️ Print Certificate</button><a class="dde-btn is-ghost" href="' + L.dashboard + '">← Level ' + n + ' dashboard</a></div>' +
      '<div class="dde-cert-scroll"><div class="dde-cert-fit"><article class="dde-cert" aria-label="Certificate of Completion">' +
      '<div class="dde-cert-frame"></div>' + corner('left:30px;top:30px') + corner('right:30px;top:30px;transform:scaleX(-1)') +
      corner('left:30px;bottom:30px;transform:scaleY(-1)') + corner('right:30px;bottom:30px;transform:scale(-1,-1)') +
      '<div class="dde-cert-body">' +
      '<p class="dde-cert-org">DIGITAL DESIGN EXPLORER</p>' +
      '<p class="dde-cert-orgsub">Department of Electronics and Communication Engineering • GSSSIETW, Mysuru</p>' +
      '<h1 class="dde-cert-title">Certificate<em>of Completion</em></h1><div class="dde-cert-rule"></div>' +
      '<p class="dde-cert-lead">This is to certify that</p>' +
      '<p class="dde-cert-name">' + esc(name) + '</p>' +
      '<p class="dde-cert-usn">USN: ' + esc(usn) + (st.section ? ' &nbsp;•&nbsp; Section ' + esc(String(st.section).trim().toUpperCase()) : '') + (st.semester ? ' &nbsp;•&nbsp; Semester ' + esc(st.semester) : '') + '</p>' +
      '<p class="dde-cert-lead">has successfully completed the course</p>' +
      '<p class="dde-cert-course">Level ' + n + ' – ' + esc(L.title) + '</p>' +
      '<p class="dde-cert-desc">of the Digital Design Explorer interactive learning programme, ' + DESCRIPTIONS[n] + '.</p>' +
      '<div class="dde-cert-foot">' +
      '<div class="dde-cert-sign"><div class="line">' + esc(date) + '</div>Date of Issue</div>' + SEAL +
      '<div class="dde-cert-sign"><div class="line">' + esc(instructor) + '</div>Course Instructor<br>Dept. of ECE, GSSSIETW, Mysuru</div></div>' +
      '<p class="dde-cert-meta">Certificate ID: <b>' + cid + '</b> &nbsp;•&nbsp; Issued by Digital Design Explorer, Department of ECE, GSSSIETW, Mysuru</p>' +
      '</div></article></div></div>' +
      '<p class="dde-cert-hint">Tip: in the print window choose <b>Landscape</b>, paper size <b>A4</b>, and turn on <b>Background graphics</b>. Choose “Save as PDF” to keep a digital copy.</p></div>';
    // Move the certificate page to be a direct child of <body> so print shows only it
    var pageEl = root.querySelector('.dde-cert-page');
    document.body.insertBefore(pageEl, root);
    document.getElementById('ddePrint').addEventListener('click', function () { window.print(); });
    fitCertificate();
    window.addEventListener('resize', fitCertificate);
  }
  function fitCertificate() {
    var fit = document.querySelector('.dde-cert-fit'), cert = document.querySelector('.dde-cert');
    if (!fit || !cert) return;
    var avail = fit.parentNode.clientWidth - 36, k = Math.min(1, avail / 1000);
    cert.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    cert.style.transformOrigin = 'top left';
    fit.style.width = (1000 * k) + 'px';
    fit.style.height = (cert.offsetHeight * k) + 'px';
    fit.style.margin = '0 auto';
  }
  DDE.renderCertificate = renderCertificate;

  /* ---------- Boot ---------- */
  function boot() {
    mountChrome();
    var ov = document.getElementById('dde-overview');
    if (ov) renderOverview(ov);
    var lk = document.getElementById('dde-locked');
    if (lk) renderLocked(lk);
    var ce = document.querySelector('[data-dde-certificate]');
    if (ce) renderCertificate(ce, parseInt(ce.getAttribute('data-dde-certificate'), 10));
    // A page whose own logout() is still called keeps working; make it use the common one too
    if (typeof window.logout !== 'function') window.logout = logout;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
