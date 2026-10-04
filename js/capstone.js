/* Digital Design Explorer – 🏆 Final Capstone (student page)
   Stages are saved to Supabase with dde_capstone_save (level 15, module = stage) and loaded with
   dde_capstone_load. Part B access is enforced by the server for every save. */
(function () {
  'use strict';
  var C = window.DDE_CAPSTONE, root, state = { stages: {}, ev: null, student: null, cur: 1, mode: 'student', busy: false, view: 'stages', partb: null };
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function when(t) { if (!t) return '–'; var d = new Date(t); return isNaN(d) ? '–' : d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }); }
  function rpc(fn, args) { return window.DDEProgress ? DDEProgress.rpc(fn, args) : Promise.reject(new Error('progress-sync.js not loaded')); }
  function done(n) { return !!(state.stages[n] && state.stages[n].completed); }
  function nDone() { var c = 0; for (var i = 1; i <= 12; i++) if (done(i)) c++; return c; }
  function approved() { return !!(state.ev && state.ev.approved); }
  function msg(kind, text) { var m = $('#capMsg'); if (m) { m.className = 'l7-fb ' + (text ? kind : ''); m.innerHTML = text || ''; } }

  var JOURNEY = ['Specification', 'Architecture', 'VLSI Circuit Design', 'Timing & Power', 'RTL Design', 'Synthesis', 'Physical Design', 'Verification', 'DFT & Testing', 'Processor Architecture', 'AI/ML Enhancement'];

  function hero() {
    return '<section class="l7-hero" style="--acc:#d48a00"><div class="l7-kicker">PART B · Final component after Level 14</div>' +
      '<h1>🏆 Final Capstone — Complete VLSI Design Challenge</h1>' +
      '<p class="l7-lead">One project that brings together everything from Levels 7–14: take a design from specification to an AI/ML-enhanced, verified, testable, physically implemented chip.</p>' +
      '<div class="cap-journey">' + JOURNEY.map(function (j, i) { return '<span>' + esc(j) + '</span>' + (i < JOURNEY.length - 1 ? '<i>→</i>' : ''); }).join('') + '</div></section>';
  }

  function trackHTML() {
    var steps = C.STAGES.map(function (s) { return [s.n, s.icon + ' ' + s.t, done(s.n) ? 'ok' : s.n === state.cur ? 'cur' : '']; });
    steps.push([13, '👩‍🏫 Faculty Evaluation', state.ev ? 'ok' : done(12) ? 'cur' : '']);
    steps.push([14, '🎉 Completed', approved() ? 'ok' : '']);
    return '<div class="cap-track" role="list">' + steps.map(function (s) {
      return '<button type="button" role="listitem" class="cap-step ' + s[2] + '" data-n="' + s[0] + '"' + (s[0] > 12 ? ' disabled' : '') + '>' +
        '<b>' + (s[0] <= 12 ? s[0] : s[0] === 13 ? '★' : '✓') + '</b><span>' + esc(s[1]) + '</span></button>';
    }).join('') + '</div>';
  }

  function fieldHTML(f, v, ro) {
    var id = 'cap_' + f.k, dis = ro ? ' disabled' : '', req = f.req ? ' <span class="cap-req">*</span>' : '';
    if (f.type === 'select') return '<label class="cap-f" for="' + id + '">' + esc(f.l) + req + '<select id="' + id + '" data-k="' + f.k + '"' + dis + '><option value="">– choose –</option>' +
      f.o.map(function (o) { return '<option' + (v === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></label>';
    if (f.type === 'check') { var arr = Array.isArray(v) ? v : []; return '<fieldset class="cap-f"><legend>' + esc(f.l) + req + '</legend><div class="cap-checks">' +
      f.o.map(function (o, i) { return '<label><input type="checkbox" data-k="' + f.k + '" value="' + esc(o) + '"' + (arr.indexOf(o) >= 0 ? ' checked' : '') + dis + '> ' + esc(o) + '</label>'; }).join('') + '</div></fieldset>'; }
    if (f.type === 'text') return '<label class="cap-f" for="' + id + '">' + esc(f.l) + req + '<input id="' + id + '" type="text" maxlength="300" data-k="' + f.k + '" value="' + esc(v || '') + '"' + dis + '></label>';
    return '<label class="cap-f" for="' + id + '">' + esc(f.l) + req + (f.min ? ' <small>(min ' + f.min + ' characters)</small>' : '') +
      '<textarea id="' + id + '" rows="4" maxlength="4000" data-k="' + f.k + '"' + dis + '>' + esc(v || '') + '</textarea></label>';
  }

  function collect(stage) {
    var d = {};
    stage.f.forEach(function (f) {
      if (f.type === 'check') d[f.k] = Array.prototype.map.call(root.querySelectorAll('input[type=checkbox][data-k="' + f.k + '"]:checked'), function (x) { return x.value; });
      else { var el = root.querySelector('[data-k="' + f.k + '"]'); d[f.k] = el ? String(el.value).trim() : ''; }
    });
    return d;
  }

  function stageHTML() {
    var s = C.STAGES[state.cur - 1], d = (state.stages[s.n] || {}).details || {}, ro = state.mode !== 'student' || approved();
    var h = '<div class="l7-lab"><div class="l7-lab-bar"><i></i>Stage ' + s.n + ' of 12 · ' + esc(s.lv) + '</div><div class="l7-lab-body">' +
      '<h2 style="margin:0 0 6px">' + s.icon + ' ' + esc(s.t) + (done(s.n) ? ' <span class="cap-badge">✓ complete</span>' : '') + '</h2><p class="l7-hint">' + esc(s.intro) + '</p>' +
      s.f.map(function (f) { return fieldHTML(f, d[f.k], ro); }).join('');
    if (!ro) {
      h += '<div class="l7-row" style="margin-top:12px"><button type="button" class="l7-btn ghost" id="capSave">💾 Save draft</button>' +
        (s.n < 12 ? '<button type="button" class="l7-btn pri" id="capDone">✓ Save & mark stage complete</button>'
          : '<button type="button" class="l7-btn pri" id="capSubmit">📤 Submit project for faculty evaluation</button>') + '</div>';
    } else if (state.mode !== 'student') h += '<p class="l7-hint">Teacher preview – students fill in these forms; review submissions in Faculty Dashboard → Final Capstone.</p>';
    else h += '<p class="l7-hint">🔒 Your project has been approved – it can no longer be edited.</p>';
    return h + '<div id="capMsg" class="l7-fb"></div></div></div>';
  }

  function evalHTML() {
    if (!state.ev) return done(12) ? '<div class="l7-verdict warn">📤 Submitted on ' + when((state.stages[12].details || {}).submitted_at) + '<small>Your faculty will evaluate the project. The result will appear here.</small></div>' : '';
    var e = state.ev, sc = e.scores || {};
    var h = (approved() ? '<div class="cap-done"><div class="cap-done-t">🎉 FINAL CAPSTONE COMPLETED</div>' +
        '<div class="cap-done-g"><span>Student</span><b>' + esc((state.student || {}).name) + '</b><span>Project</span><b>' + esc(((state.stages[1] || {}).details || {}).title) + '</b>' +
        '<span>Final score</span><b>' + esc(e.total) + ' / 100</b><span>Completed</span><b>' + when(e.evaluated_at) + '</b><span>Approved by</span><b>' + esc(e.evaluated_by || 'Faculty') + '</b></div>' +
        '<a class="l7-btn pri" href="capstone-certificate.html">🏅 View certificate</a></div>' : '<div class="l7-verdict warn">👩‍🏫 Evaluated – not yet approved<small>Read the comments, improve your work and resubmit if your faculty asks you to.</small></div>');
    h += '<div class="l7-table-wrap"><table class="l7-cmp"><tr><th>Rubric</th><th>Score</th></tr>' + C.RUBRIC.map(function (r) { return '<tr><td>' + esc(r[1]) + '</td><td>' + (sc[r[0]] != null ? sc[r[0]] : 0) + ' / ' + r[2] + '</td></tr>'; }).join('') +
      '<tr><td><b>Total</b></td><td><b>' + esc(e.total) + ' / 100</b></td></tr></table></div>' + (e.comments ? '<div class="l7-readout"><span class="k">Faculty comments</span><br>' + esc(e.comments) + '</div>' : '');
    return h;
  }

  function reportHTML() {
    var g = function (n, k) { return ((state.stages[n] || {}).details || {})[k]; };
    var val = function (n, k) { var v = g(n, k); return Array.isArray(v) ? v.join(', ') : (v || '–'); };
    var sec = function (t, parts) { return '<section class="cap-rep-s"><h3>' + esc(t) + '</h3>' + parts.map(function (p) { return '<p><b>' + esc(p[0]) + ':</b> ' + esc(val(p[1], p[2])).replace(/\n/g, '<br>') + '</p>'; }).join('') + '</section>'; };
    var st = state.student || {};
    return '<div class="cap-report" id="capReport"><div class="l7-row cap-noprint"><button type="button" class="l7-btn ghost" id="capBack">← Back to stages</button><button type="button" class="l7-btn pri" onclick="window.print()">🖨 Print / Save as PDF</button></div>' +
      '<h1>' + esc(val(1, 'title')) + '</h1><p class="cap-rep-sub">Final Capstone – Complete VLSI Design Challenge · ' + esc(st.name || '') + ' (' + esc(st.usn || '') + ')' + (g(1, 'team') === 'Team' ? ' · Team: ' + esc(val(1, 'members')) : ' · Individual project') + '</p>' +
      sec('1. Problem statement and requirements', [['Project type', 1, 'type'], ['Objective', 1, 'objective'], ['Problem statement', 2, 'problem'], ['Requirements', 2, 'requirements'], ['Inputs', 2, 'inputs'], ['Outputs', 2, 'outputs'], ['Functional requirements', 2, 'functional'], ['Performance requirements', 2, 'performance']]) +
      sec('2. Architecture', [['Block diagram', 3, 'blocks'], ['Datapath', 3, 'datapath'], ['Control', 3, 'control'], ['Interfaces', 3, 'interfaces'], ['Memory', 3, 'memory'], ['Decisions', 3, 'decisions']]) +
      sec('3. Design methodology and VLSI design', [['Aspects', 4, 'aspects'], ['Considerations', 4, 'notes'], ['Tools', 1, 'tools']]) +
      sec('4. RTL design and synthesis', [['RTL', 6, 'rtl'], ['FSM / datapath', 6, 'fsm'], ['Synthesis results', 6, 'synthesis'], ['Code', 6, 'code']]) +
      sec('5. Timing and power', [['Critical path', 5, 'critical'], ['Clocking', 5, 'clocking'], ['Delay', 5, 'delay'], ['Power', 5, 'power'], ['Optimisation', 5, 'optimisation']]) +
      sec('6. Physical design', [['Method', 7, 'mode'], ['Steps', 7, 'steps'], ['Details', 7, 'notes']]) +
      sec('7. Verification', [['Plan', 8, 'plan'], ['Testbench', 8, 'testbench'], ['Assertions', 8, 'assertions'], ['Functional coverage', 8, 'fcov'], ['Code coverage', 8, 'ccov'], ['Closure', 8, 'closure']]) +
      sec('8. DFT and testing', [['Methods', 9, 'methods'], ['Strategy', 9, 'notes']]) +
      sec('9. Architecture and performance', [['Relevance', 10, 'relevance'], ['Concepts', 10, 'concepts'], ['Explanation', 10, 'explanation']]) +
      sec('10. AI/ML component', [['Enhancement', 11, 'choice'], ['Description', 11, 'description']]) +
      sec('11. Results, limitations and future work', [['Results', 12, 'results'], ['Limitations', 12, 'limitations'], ['Future work', 12, 'future']]) +
      sec('12. Conclusion', [['Conclusion', 12, 'conclusion']]) + '</div>';
  }

  function partbText() { return state.partb == null ? '' : 'Part B learning completed: ' + state.partb + ' module' + (state.partb === 1 ? '' : 's') + ' of Levels 7–14. Your faculty consider this preparation when evaluating the capstone.'; }

  function draw() {
    if (state.view === 'report') { root.innerHTML = reportHTML(); $('#capBack').addEventListener('click', function () { state.view = 'stages'; draw(); }); window.scrollTo(0, 0); return; }
    var pct = Math.round(100 * nDone() / 12);
    root.innerHTML = hero() +
      (state.mode !== 'student' ? '<div class="l7-verdict warn">👩‍🏫 Teacher preview<small>You are viewing the capstone page as a teacher. Student submissions are reviewed and evaluated in Faculty Dashboard → Final Capstone.</small></div>' : '') +
      '<section class="l7-sec"><div class="cap-prog"><div><b>' + nDone() + ' / 12</b> stages complete · ' + pct + ' %</div><div class="dde-bar' + (pct >= 100 ? ' is-full' : '') + '"><span style="width:' + pct + '%"></span></div>' +
      '<div class="l7-hint" id="capPartB">' + partbText() + '</div></div>' +
      trackHTML() + '<div id="capEval">' + evalHTML() + '</div>' + stageHTML() +
      (nDone() >= 1 ? '<div class="l7-row" style="margin-top:14px"><button type="button" class="l7-btn ghost" id="capRep">📑 View / print final report</button></div>' : '') + '</section>';
    Array.prototype.forEach.call(root.querySelectorAll('.cap-step[data-n]'), function (b) { b.addEventListener('click', function () { var n = +b.getAttribute('data-n'); if (n <= 12) { state.cur = n; draw(); } }); });
    var r = $('#capRep'); if (r) r.addEventListener('click', function () { state.view = 'report'; draw(); });
    var sv = $('#capSave'), dn = $('#capDone'), sb = $('#capSubmit');
    if (sv) sv.addEventListener('click', function () { save(false); });
    if (dn) dn.addEventListener('click', function () { save(true); });
    if (sb) sb.addEventListener('click', function () { save(true); });
  }

  function save(complete) {
    if (state.busy) return;
    var s = C.STAGES[state.cur - 1], d = collect(s);
    if (complete) {
      var probs = C.check(s, d);
      if (probs.length) { msg('bad', '⚠️ Not complete yet:<br>' + probs.map(esc).join('<br>')); return; }
      if (s.n === 12) {
        var missing = []; for (var i = 1; i <= 11; i++) if (!done(i)) missing.push(i);
        if (missing.length) { msg('bad', '⚠️ Complete stages ' + missing.join(', ') + ' before submitting.'); return; }
        if (!window.confirm('Submit your capstone for faculty evaluation?')) return;
      }
    }
    state.busy = true; msg('info', 'Saving…');
    rpc('dde_capstone_save', { p_token: get('ddeSessionToken'), p_stage: s.n, p_data: d, p_complete: !!complete }).then(function (r) {
      state.busy = false;
      if (!r || !r.ok) {
        var e = r && r.error;
        msg('bad', e === 'no_partb_access' ? '🔒 Part B access is required to save your capstone.' : e === 'not_logged_in' ? 'Your session has ended – please log in again.' : e === 'stages_incomplete' ? 'Complete stages 1–11 before submitting.' : e === 'locked_after_approval' ? 'Your project is approved and can no longer be edited.' : 'Could not save (' + (e || 'error') + ').');
        return;
      }
      var prev = state.stages[s.n] || {};
      state.stages[s.n] = { stage: s.n, details: s.n === 12 && complete ? Object.assign({}, d, { submitted_at: new Date().toISOString() }) : d, completed: r.completed || prev.completed, updated_at: new Date().toISOString() };
      if (complete && s.n < 12) { state.cur = s.n + 1; draw(); msg('ok', '✓ Stage ' + s.n + ' saved and complete. On to stage ' + (s.n + 1) + '.'); }
      else { draw(); msg('ok', complete ? '📤 Project submitted. Your faculty will evaluate it.' : '💾 Draft saved.'); }
    }, function (e) { state.busy = false; msg('bad', 'Could not reach the server: ' + esc(e && e.message || e)); });
  }

  function start() {
    root = document.getElementById('capstone'); if (!root) return;
    var tok = get('ddeSessionToken');
    if (!tok && sget('ddeTeacherToken')) { state.mode = 'teacher'; draw(); return; }
    root.innerHTML = '<p class="l7-hint" style="padding:30px">Loading your capstone…</p>';
    rpc('dde_capstone_load', { p_token: tok }).then(function (r) {
      if (!r || !r.ok) { if (r && r.error === 'not_logged_in') { location.replace('login.html?partb=1&next=capstone.html'); return; } root.innerHTML = '<div class="l7-verdict bad">Could not load your capstone (' + esc(r && r.error) + ').</div>'; return; }
      if (!r.granted) { location.replace('locked.html?partb=1&level=15'); return; }
      state.student = r.student; state.ev = r.evaluation || null;
      (r.stages || []).forEach(function (s) { state.stages[s.stage] = s; });
      for (var i = 1; i <= 12; i++) if (!done(i)) { state.cur = i; break; }
      draw();
      rpc('dde_load_progress', { p_token: tok }).then(function (p) {
        if (p && p.ok) { state.partb = (p.modules || []).filter(function (m) { return m.level >= 7 && m.level <= 14 && m.completed; }).length; var el = document.getElementById('capPartB'); if (el) el.textContent = partbText(); }
      }, function () {});
    }, function (e) { root.innerHTML = '<div class="l7-verdict bad">Could not reach the server. Please check your connection.</div>'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  window.DDECapstone = { state: state };
})();
