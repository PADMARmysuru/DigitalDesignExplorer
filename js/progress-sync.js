/* =====================================================================
   Digital Design Explorer – progress sync (Supabase)
   ---------------------------------------------------------------------
   One global: window.DDEProgress
   * localStorage stays the fast, local UI state (unchanged keys).
   * Supabase (student_module_progress) is the persistent record the
     teacher dashboard reads. The browser never touches tables directly:
     it calls the dde_* functions created by progress-setup.sql.
   * Session token: localStorage 'ddeSessionToken' (set at login).
   * Failed saves are queued in 'ddePendingSaves' and retried.
   ===================================================================== */
(function () {
  'use strict';

  var TOKEN = 'ddeSessionToken', PENDING = 'ddePendingSaves';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } }
  function del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  function json(k, d) { try { var v = JSON.parse(get(k)); return v == null ? d : v; } catch (e) { return d; } }
  function log() { if (window.console) console.error.apply(console, ['[DDE progress]'].concat([].slice.call(arguments))); }

  /* ---------- Supabase configuration (reuses supabase-config.js) ---------- */
  var cfgPromise = null;
  function config() {
    if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') return Promise.resolve({ url: SUPABASE_URL, key: SUPABASE_ANON_KEY });
    if (!cfgPromise && window.ddeLoadConfig) cfgPromise = window.ddeLoadConfig().then(function (ok) { return ok ? { url: SUPABASE_URL, key: SUPABASE_ANON_KEY } : null; });
    if (!cfgPromise) cfgPromise = new Promise(function (res) {
      var s = document.createElement('script'); s.src = 'supabase-config.js';
      s.onload = function () { res(typeof SUPABASE_URL !== 'undefined' ? { url: SUPABASE_URL, key: SUPABASE_ANON_KEY } : null); };
      s.onerror = function () { res(null); };
      document.head.appendChild(s);
    });
    return cfgPromise;
  }

  function Err(code, msg) { var e = new Error(msg || code); e.code = code; return e; }

  /* Call one dde_* function. Throws Err with code: config, network, rls, setup, server */
  function rpc(fn, args) {
    return config().then(function (c) {
      if (!c) { log('Supabase connection error: supabase-config.js could not be loaded.'); throw Err('config', 'Supabase configuration missing'); }
      return fetch(c.url + '/rest/v1/rpc/' + fn, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': c.key, 'Authorization': 'Bearer ' + c.key },
        body: JSON.stringify(args || {})
      }).catch(function (e) { log('Supabase connection error (' + fn + '):', e && e.message); throw Err('network', 'No connection'); });
    }).then(function (res) {
      return res.text().then(function (txt) {
        var data; try { data = JSON.parse(txt); } catch (e) { data = txt; }
        if (res.ok) return data;
        var msg = (data && data.message) || txt;
        var code = /row-level security/i.test(msg) ? 'rls' : (res.status === 404 || /PGRST202|Could not find the function/i.test(msg)) ? 'setup' : 'server';
        log(fn + ' failed (HTTP ' + res.status + ', ' + code + '):', msg);
        throw Err(code, msg);
      });
    });
  }

  /* ---------- Messages to the student (never fail silently) ---------- */
  var MSG = {
    network: 'Progress could not be saved. Please check your connection and try again.',
    login: 'Your progress is saved on this device only. Please log in again so it is saved to your account.',
    setup: 'Progress could not be saved: progress tracking is not set up on the server yet. Please tell your teacher.',
    server: 'Progress could not be saved because of a server error. Please try again later or tell your teacher.'
  };
  var toastEl = null, lastToast = '';
  function toast(kind, text, retry) {
    if (!document.body) return;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.setAttribute('role', 'alert');
      toastEl.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;max-width:min(560px,calc(100% - 24px));' +
        'background:#fff;border:1px solid #dfe4ec;border-left:5px solid #c9a227;border-radius:12px;box-shadow:0 10px 30px rgba(22,39,70,.18);' +
        'padding:12px 14px;font:500 14px/1.45 "Segoe UI",system-ui,Arial,sans-serif;color:#1d2433;display:flex;gap:10px;align-items:center;flex-wrap:wrap';
      document.body.appendChild(toastEl);
    }
    if (lastToast === text && toastEl.style.display !== 'none') return;
    lastToast = text;
    toastEl.style.borderLeftColor = kind === 'ok' ? '#1f8a4c' : kind === 'warn' ? '#c9a227' : '#d64545';
    toastEl.innerHTML = '';
    var span = document.createElement('span'); span.textContent = text; span.style.flex = '1 1 220px'; toastEl.appendChild(span);
    function btn(label, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = label;
      b.style.cssText = 'border:0;border-radius:8px;padding:7px 12px;font-weight:700;font-size:13px;font-family:inherit;cursor:pointer;background:#162746;color:#fff';
      b.onclick = fn; toastEl.appendChild(b); return b;
    }
    if (retry) btn('Try again', function () { hide(); retry(); });
    if (kind === 'login') btn('Log in', function () { location.href = 'login.html?next=' + encodeURIComponent((location.pathname.split('/').pop() || 'index.html')); });
    var x = btn('✕', hide); x.style.background = '#eef0f4'; x.style.color = '#1d2433'; x.setAttribute('aria-label', 'Close');
    toastEl.style.display = 'flex';
    if (kind === 'ok') setTimeout(hide, 2500);
  }
  function hide() { if (toastEl) toastEl.style.display = 'none'; lastToast = ''; }

  function report(e, retry) {
    var code = e && e.code;
    if (code === 'network' || code === 'config') toast('error', MSG.network, retry);
    else if (code === 'login') toast('login', MSG.login);
    else if (code === 'setup') toast('error', MSG.setup);
    else if (code === 'rls') toast('error', MSG.server + ' (permission)');
    else toast('error', MSG.server, retry);
  }

  /* ---------- Pending queue: saves that failed are retried later ---------- */
  function queue(item) {
    var q = json(PENDING, []) || [];
    if (item.type === 'save') q = q.filter(function (x) { return !(x.type === 'save' && x.level === item.level && x.module === item.module); });
    q.push(item); set(PENDING, JSON.stringify(q.slice(-50)));
  }
  function dequeue(id) { set(PENDING, JSON.stringify((json(PENDING, []) || []).filter(function (x) { return x.id !== id; }))); }
  var flushing = false;
  function flush() {
    var q = json(PENDING, []) || [];
    if (flushing || !q.length || !get(TOKEN)) return Promise.resolve();
    flushing = true;
    return q.reduce(function (p, it) {
      return p.then(function () { return send(it).then(function () { dequeue(it.id); }); });
    }, Promise.resolve()).then(function () { flushing = false; }, function (e) { flushing = false; throw e; });
  }

  function send(it) {
    var token = get(TOKEN);
    if (!token) return Promise.reject(Err('login', 'Student not logged in (no session token)'));
    var call = it.type === 'quiz'
      ? rpc('dde_record_quiz', { p_token: token, p_level: it.level, p_module: it.module, p_score: it.score, p_total: it.total })
      : rpc('dde_save_module', { p_token: token, p_level: it.level, p_module: it.module, p_data: it.data });
    return call.then(function (r) {
      if (r && r.ok) return r;
      var err = r && r.error;
      if (err === 'not_logged_in') { log('Session expired or invalid student ID – please log in again.'); del(TOKEN); throw Err('login', err); }
      log((it.type === 'quiz' ? 'Quiz save' : 'Progress save') + ' rejected:', err);
      throw Err('server', err);
    });
  }

  function submit(item) {
    item.id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    if (!get(TOKEN)) {
      // Not logged in (e.g. a teacher using the content in class): nothing is saved or queued
      if (get('studentLoggedIn') !== 'true') return Promise.resolve({ ok: false, error: 'not_logged_in', anonymous: true });
      queue(item);
      log('Student ID missing: logged in on this device but no server session.'); report(Err('login'));
      return Promise.resolve({ ok: false, error: 'not_logged_in' });
    }
    return flush().catch(function () { /* older items keep waiting */ }).then(function () {
      return send(item);
    }).then(function (r) { hide(); return r; }, function (e) {
      if (e.code !== 'setup') queue(item);
      report(e, function () { flush().then(function () { toast('ok', '✓ Progress saved.'); }, function (e2) { report(e2); }); });
      return { ok: false, error: e.code };
    });
  }

  /* ---------- Module catalogue: what each module tracks (from existing keys) ----------
     Level 1 modules follow the order of the Level 1 dashboard (dashboard.html). */
  function flag(k) { return get(k) === 'true'; }
  function countKeys(n, test) { var a = []; for (var i = 1; i <= n; i++) if (test(i)) a.push(i); return a; }
  function oneFlag(key) {
    return {
      read: function () { var d = flag(key); return { activities_completed: d ? 1 : 0, activities_total: 1, details: {} }; },
      restore: function (row) { if (row.activities_completed >= 1) set(key, 'true'); }
    };
  }
  /* A scored test: complete when the BEST score reaches CERT_PASS_PERCENT (access-control.js).
     bestKeys: keys that may hold a score (the highest one counts); totalKey/defTotal: number of questions;
     bestStore: where the best score is kept; finishedKey: optional "finished" flag; legacyKey: old "done" flag. */
  function passPct() { return (typeof CERT_PASS_PERCENT === 'number' && CERT_PASS_PERCENT > 0) ? CERT_PASS_PERCENT : 50; }
  function numKey(k) { var v = get(k); if (v === null || v === '') return null; v = +v; return isNaN(v) ? null : v; }
  function scoredTest(bestKeys, totalKey, defTotal, bestStore, finishedKey, extraRestore, legacyKey) {
    function best() {
      var b = null;
      bestKeys.forEach(function (k) { var v = numKey(k); if (v !== null && (b === null || v > b)) b = v; });
      if (finishedKey && !flag(finishedKey)) return null;
      return b;
    }
    function total() { return (totalKey && numKey(totalKey)) || defTotal; }
    return {
      scored: true,
      read: function () {
        var b = best(), t = total(), legacy = (legacyKey && flag(legacyKey)) || (finishedKey && flag(finishedKey) && b === null);
        if (b === null && !legacy) return { skip: true };
        var passed = legacy || (b !== null && b >= Math.ceil(t * passPct() / 100));
        return { activities_completed: 0, activities_total: 0, has_quiz: true, quiz_passed: !!passed,
                 details: { best: b, total: t, pass_percent: passPct() } };
      },
      restore: function (row) {
        var d = row.details || {}, b = Math.max(d.best == null ? -1 : +d.best, row.best_score == null ? -1 : +row.best_score);
        if (b >= 0 && (numKey(bestStore) === null || b > numKey(bestStore))) set(bestStore, String(b));
        if (totalKey && d.total && numKey(totalKey) === null) set(totalKey, String(d.total));
        if (finishedKey && b >= 0) set(finishedKey, 'true');
        if (legacyKey && row.completed && (d.best == null)) set(legacyKey, 'true');
        if (extraRestore) extraRestore(row);
      }
    };
  }
  var CATALOG = {
    1: {
      1: { name: 'Logic Gates', page: 'logic-gates.html', items: '7 gates explored',
           read: function () {
             var g = (json('completedGates', []) || []).filter(function (x, i, a) { return a.indexOf(x) === i; });
             return { activities_completed: Math.min(g.length, 7), activities_total: 7, details: { gates: g } };
           },
           restore: function (row) {
             var g = json('completedGates', []) || [], add = (row.details && row.details.gates) || [];
             add.forEach(function (x) { if (g.indexOf(x) < 0) g.push(x); });
             set('completedGates', JSON.stringify(g));
           } },
      2: Object.assign({ name: 'Half Adder', page: 'half-adder.html', items: 'completed' }, oneFlag('halfAdderCompleted')),
      3: Object.assign({ name: 'Full Adder', page: 'full-adder.html', items: 'completed' }, oneFlag('fullAdderCompleted')),
      4: { name: 'Verilog Practice', page: 'practice.html', items: '10 programs',
           read: function () { var p = countKeys(10, function (i) { return get('practice' + i) === 'completed'; }); return { activities_completed: p.length, activities_total: 10, details: { programs: p } }; },
           restore: function (row) { ((row.details && row.details.programs) || []).forEach(function (i) { set('practice' + i, 'completed'); }); } },
      5: Object.assign({ name: 'Quiz', page: 'quiz.html', items: 'quiz', quiz: true }, scoredTest(['quizBestScore', 'quizScore'], 'quizTotal', 110, 'quizBestScore', null,
           function (row) { if (row.latest_score != null && get('quizScore') === null) { set('quizScore', String(row.latest_score)); set('quizTotal', String(row.quiz_total)); } })),
      6: Object.assign({ name: 'K-Map', page: 'kmap.html', items: 'completed' }, oneFlag('kmapCompleted')),
      7: Object.assign({ name: 'Quine–McCluskey', page: 'quine-mccluskey.html', items: 'completed' }, scoredTest(['qmPracticeBest', 'qmPracticeScore'], 'qmPracticeTotal', 10, 'qmPracticeBest', 'qmPracticeCompleted')),
      8: { name: 'Digital Logic Lab', page: 'digital-logic-lab.html', items: '8 experiments',
           read: function () { var e = countKeys(8, function (i) { return flag('digitalLabExp' + i); }); return { activities_completed: e.length, activities_total: 8, details: { experiments: e } }; },
           restore: function (row) { ((row.details && row.details.experiments) || []).forEach(function (i) { set('digitalLabExp' + i, 'true'); }); } }
    },
    /* Level 2 – order of the Level 2 dashboard */
    2: {
      1: { name: 'Gate-Level Realization', page: 'gate-realization.html', items: '20 problems',
           read: function () {
             var g = (json('completedGateProblems', []) || []).filter(function (x, i, a) { return a.indexOf(x) === i; });
             return { activities_completed: Math.min(g.length, 20), activities_total: 20, details: { problems: g } };
           },
           restore: function (row) {
             var g = json('completedGateProblems', []) || [], add = (row.details && row.details.problems) || [];
             add.forEach(function (x) { if (g.indexOf(x) < 0) g.push(x); });
             set('completedGateProblems', JSON.stringify(g));
           } },
      2: Object.assign({ name: 'Sequential Circuits challenge', page: 'sequential-circuits.html', items: 'completed' }, oneFlag('sequentialChallengeDone')),
      3: Object.assign({ name: 'Sequential Circuits – 20 problems test', page: 'sequential-circuits-20-problems.html', items: 'test', quiz: true },
           scoredTest(['sequential20Best'], null, 20, 'sequential20Best', null, null, 'sequentialCircuitsDone')),
      4: Object.assign({ name: 'Counters', page: 'counters.html', items: 'completed' }, oneFlag('counterActivityDone')),
      5: Object.assign({ name: 'Registers', page: 'registers.html', items: 'completed' }, oneFlag('registerActivityDone')),
      6: Object.assign({ name: 'State Machines', page: 'state-machines.html', items: 'completed' }, oneFlag('stateMachineActivityDone'))
    },
    /* Level 3 – order of the Level 3 dashboard (a module is complete when its final challenge is solved) */
    3: {
      1: Object.assign({ name: 'Verilog Basics', page: 'verilog-basics.html', items: 'final challenge' }, oneFlag('verilogBasicsDone')),
      2: Object.assign({ name: 'Structural Modeling', page: 'verilog-structural.html', items: 'final challenge' }, oneFlag('verilogStructuralDone')),
      3: Object.assign({ name: 'Data-Flow Modeling', page: 'verilog-dataflow.html', items: 'final challenge' }, oneFlag('verilogDataflowDone')),
      4: Object.assign({ name: 'Behavioral Modeling', page: 'verilog-behavioral.html', items: 'final challenge' }, oneFlag('verilogBehavioralDone')),
      5: Object.assign({ name: 'RTL Modeling', page: 'verilog-rtl.html', items: 'final challenge' }, oneFlag('verilogRTLDone')),
      6: Object.assign({ name: 'Testbench & Verification', page: 'verilog-testbench-verification.html', items: 'final challenge' }, oneFlag('verilogVerificationDone'))
    }
  };

  /* ---------- Part B levels that use the shared engine (js/level7-common.js) ----------
     Local format: dde_level<L>_progress.m[<n>] = { a:{id:1}, req:{a,p,c}, q:{best,last,total,tries} }
     Mapping: concepts = Learn-tab animations (req.c), activities = labs/reveal/drag,
              practice = all practice sets, quiz = passed (best >= 70 %). */
  var PARTB_SYNC = { 9: true, 10: true, 11: true, 12: true, 13: true, 14: true };          // add 7 or 8 here to send those levels to Supabase too
  var PARTB_PASS = 0.7;
  function partB(level, module) {
    var key = 'dde_level' + level + '_progress', doneKey = 'level' + level + '_module' + module + '_completed';
    function rec() { var d = json(key, {}) || {}; return { d: d, m: (d.m && d.m[module]) || null }; }
    return {
      name: 'Module ' + module, partB: true,
      read: function () {
        var m = rec().m || {}, a = m.a || {}, req = m.req, q = m.q || null;
        var has = function (id) { return !!a[id]; };
        if (!req) return { skip: true };
        var c = req.c || [], acts = req.a.filter(function (id) { return c.indexOf(id) < 0; });
        var any = req.a.concat(req.p).some(has) || !!(q && q.tries);
        var data = {
          activities_completed: acts.filter(has).length, activities_total: acts.length,
          concepts_completed: c.length ? c.every(has) : null,
          practice_completed: req.p.length ? req.p.every(has) : null,
          has_quiz: true,
          quiz_passed: !!(q && q.total && q.best / q.total >= PARTB_PASS),
          details: { a: a, q: q ? { best: q.best, last: q.last, total: q.total, tries: q.tries } : null, done: get(doneKey) === 'true' }
        };
        if (!any && !data.details.done) data.skip = true;
        return data;
      },
      restore: function (row) {
        var det = row.details || {}, r = rec(), d = r.d;
        if (!d.m) d.m = {};
        var m = d.m[module] || (d.m[module] = {});
        m.a = m.a || {};
        Object.keys(det.a || {}).forEach(function (id) { m.a[id] = 1; });
        if (det.q && det.q.total && (!m.q || (det.q.best || 0) > (m.q.best || 0) || (det.q.tries || 0) > (m.q.tries || 0))) {
          m.q = Object.assign({}, m.q || {}, { best: Math.max(det.q.best || 0, (m.q && m.q.best) || 0), last: det.q.last, total: det.q.total, tries: Math.max(det.q.tries || 0, (m.q && m.q.tries) || 0) });
        }
        set(key, JSON.stringify(d));
        if (det.done || row.completed) set(doneKey, 'true');
      }
    };
  }
  function moduleDef(level, module) {
    if (CATALOG[level] && CATALOG[level][module]) return CATALOG[level][module];
    if (PARTB_SYNC[level] && module >= 1 && module <= 10) return partB(level, module);
    return null;
  }

  /* Save one catalogued module from its existing localStorage keys */
  /* What was last sent in this browser session, so unchanged modules are not sent again */
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function sentMap() { var m = null; try { m = JSON.parse(sget('ddeSyncSent') || 'null'); } catch (e) { m = null; } return (m && m.t === get(TOKEN)) ? m : { t: get(TOKEN), h: {} }; }
  function markSent(level, module, sig) { var m = sentMap(); m.h[level + '-' + module] = sig; sset('ddeSyncSent', JSON.stringify(m)); }

  /* Save one catalogued module from its existing localStorage keys (force = send even if unchanged) */
  function syncModule(level, module, force) {
    var m = moduleDef(level, module);
    if (!m) { log('No progress definition for Level ' + level + ' Module ' + module); return Promise.resolve({ ok: false, error: 'unknown_module' }); }
    var data = m.read();
    if (data.skip || (!data.activities_completed && !data.has_quiz)) return Promise.resolve({ ok: true, skipped: true });   // nothing done yet
    delete data.skip;
    var sig = JSON.stringify(data);
    if (!force && sentMap().h[level + '-' + module] === sig) return Promise.resolve({ ok: true, unchanged: true });
    return submit({ type: 'save', level: level, module: module, data: data }).then(function (r) {
      if (r && r.ok) markSent(level, module, sig);
      return r;
    });
  }
  function syncLevel(level) {
    var mods = Object.keys(CATALOG[level] || {});
    return mods.reduce(function (p, k) { return p.then(function () { return syncModule(level, +k).catch(function () {}); }); }, Promise.resolve());
  }

  /* ---------- Levels 1–3: save automatically whenever a progress key changes ----------
     The module pages only write localStorage; this watcher sends the change to the student's
     online record (and keeps the BEST score of every test). No page needs its own save code. */
  var WATCH = [
    [1, /^(completedGates|halfAdderCompleted|fullAdderCompleted|practice\d+|quizScore|quizTotal|quizBestScore|kmapCompleted|qmPractice\w*|digitalLabExp\d+)$/],
    [2, /^(completedGateProblems|sequentialChallengeDone|sequentialCircuitsDone|sequential20Best|counterActivityDone|registerActivityDone|stateMachineActivityDone)$/],
    [3, /^verilog(Basics|Structural|Dataflow|Behavioral|RTL|Verification)Done$/]
  ];
  var BEST = { quizScore: 'quizBestScore', qmPracticeScore: 'qmPracticeBest' };   // latest score key → best score key
  var quiet = 0, timers = {};
  function rawSet(k, v) { try { ORIG_SET.call(window.localStorage, k, v); } catch (e) { /* ignore */ } }
  function onKeySet(k, v) {
    if (quiet) return;
    if (BEST[k] && v !== '' && !isNaN(+v)) { var b = numKey(BEST[k]); if (b === null || +v > b) rawSet(BEST[k], String(+v)); }
    for (var i = 0; i < WATCH.length; i++) {
      if (WATCH[i][1].test(k)) {
        var lv = WATCH[i][0];
        if (!get(TOKEN)) return;                                  // not logged in: device only (as before)
        clearTimeout(timers[lv]);
        timers[lv] = setTimeout(function () { syncLevel(lv); }, 1500);
        return;
      }
    }
  }
  var ORIG_SET = null;
  try {
    if (window.Storage && Storage.prototype.setItem && !Storage.prototype.setItem.__dde) {
      ORIG_SET = Storage.prototype.setItem;
      var hooked = function (k, v) {
        ORIG_SET.call(this, k, v);
        try { if (this === window.localStorage) onKeySet(String(k), String(v)); } catch (e) { /* never break the page */ }
      };
      hooked.__dde = true;
      Storage.prototype.setItem = hooked;
    } else if (window.Storage) ORIG_SET = Storage.prototype.setItem;
  } catch (e) { /* storage blocked */ }

  /* Run once per page on Levels 1–3: bring the online record into this browser (once per session),
     then send whatever this browser has that the server does not. */
  var RELOAD_PAGES = ['dashboard.html', 'level2-dashboard.html', 'level3-dashboard.html', 'student-dashboard.html'];
  function snapshot() {
    var o = {};
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (WATCH.some(function (w) { return w[1].test(k); })) o[k] = localStorage.getItem(k); } } catch (e) { /* ignore */ }
    return JSON.stringify(o, Object.keys(o).sort());
  }
  var autoRan = false;
  function autoSync() {
    if (autoRan) return Promise.resolve(); autoRan = true;
    var t = get(TOKEN);
    if (!t) return Promise.resolve();
    var first = sget('ddeRestoredFor') !== t;
    var before = snapshot();
    var p = first ? restore().then(function (r) { if (r && r.ok) sset('ddeRestoredFor', t); }, function () {}) : Promise.resolve();
    return p.then(function () {
      var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
      if (first && snapshot() !== before && RELOAD_PAGES.indexOf(page) >= 0 && sget('ddeRestoreReload') !== t) {
        sset('ddeRestoreReload', t); location.reload(); return;     // show the restored progress
      }
      return syncLevel(1).then(function () { return syncLevel(2); }).then(function () { return syncLevel(3); });
    });
  }

  /* Bring server progress back into this browser (new device / after login) */
  function restore() {
    var token = get(TOKEN);
    if (!token) return Promise.resolve({ ok: false, error: 'not_logged_in' });
    return rpc('dde_load_progress', { p_token: token }).then(function (r) {
      if (!r || !r.ok) { if (r && r.error === 'not_logged_in') del(TOKEN); return r; }
      quiet++;
      try {
        (r.modules || []).forEach(function (row) { var m = moduleDef(row.level, row.module); if (m && m.restore) { try { m.restore(row); } catch (e) { log('restore failed', e); } } });
      } finally { quiet--; }
      return r;
    });
  }

  window.DDEProgress = {
    rpc: rpc,
    CATALOG: CATALOG,
    PARTB_SYNC: PARTB_SYNC,
    token: function () { return get(TOKEN); },
    setToken: function (t) { if (t) set(TOKEN, t); else del(TOKEN); },
    register: function (s, password) {
      return rpc('dde_register', { p_usn: s.usn, p_name: s.name, p_email: s.email, p_branch: s.branch, p_semester: s.semester, p_section: s.section, p_password: password });
    },
    login: function (usn, email, password) { return rpc('dde_login', { p_usn: usn, p_email: email, p_password: password }); },
    logout: function () { var t = get(TOKEN); del(TOKEN); return t ? rpc('dde_logout', { p_token: t }).catch(function () {}) : Promise.resolve(); },
    saveModule: function (level, module, data) { return submit({ type: 'save', level: level, module: module, data: data }); },
    recordQuiz: function (level, module, score, total) {
      return submit({ type: 'quiz', level: level, module: module, score: +score, total: +total }).then(function (r) {
        // the pass/fail of a Levels 1–3 test follows the uniform rule (best score ≥ pass mark)
        var m = moduleDef(level, module);
        if (r && r.ok && m && m.scored) return syncModule(level, module, true).then(function () { return r; }, function () { return r; });
        return r;
      });
    },
    autoSync: autoSync,
    passPct: passPct,
    syncModule: syncModule,
    syncLevel: syncLevel,
    restore: restore,
    flush: flush,
    toast: toast
  };

  /* Retry anything that failed earlier, now and whenever the connection returns */
  function later() { flush().catch(function () {}); }
  window.addEventListener('online', later);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later); else later();
})();
