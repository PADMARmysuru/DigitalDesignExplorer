/* Digital Design Explorer – Faculty Dashboard extensions
   Adds two sections to the EXISTING teacher dashboard (no second dashboard):
     🔑 Part B Access   – grant / revoke Part B (Levels 7–14 + Final Capstone) for selected students
     🏆 Final Capstone  – every student's capstone status, review and rubric evaluation
   Every action is a server function that checks the teacher session (dde_teacher_*). */
(function () {
  'use strict';
  var o, $ = function (id) { return document.getElementById(id); };
  var C = window.DDE_CAPSTONE;
  var pb = { rows: [], sel: {} }, cap = { rows: [] };

  function rpc(fn, args) { return DDEProgress.rpc(fn, Object.assign({ p_token: o.token() }, args || {})); }
  function esc(s) { return o.esc(s); }
  function note(el, kind, text) { el.className = 'tdb-msg' + (text ? ' is-' + kind : ''); el.textContent = text || ''; }
  function guard(r) { if (r && r.error === 'not_teacher') { o.expired(); return false; } return true; }

  /* ---------- Tabs ---------- */
  function tab(name) {
    Array.prototype.forEach.call(document.querySelectorAll('.fx-tab'), function (b) { b.classList.toggle('is-on', b.getAttribute('data-tab') === name); });
    $('tdbMain').hidden = name !== 'progress'; $('fxPartB').hidden = name !== 'partb'; $('fxCap').hidden = name !== 'capstone';
    try { sessionStorage.setItem('ddeFacultyTab', name); } catch (e) {}
    if (name === 'partb') loadPartB(); if (name === 'capstone') loadCap();
  }

  /* ---------- Part B access management ---------- */
  function buildPartB() {
    $('fxPartB').innerHTML = '<div class="dde-card" style="margin-top:18px"><h2 style="margin:0 0 6px;color:var(--dde-navy);font-size:1.15rem">🔑 Part B Access Management</h2>' +
      '<p class="sub" style="margin:0 0 10px">Part B (Levels 7–14 + Final Capstone) opens only for students you select. Access is checked by the server.</p>' +
      '<div class="tdb-filters"><div><label for="pbSearch">Search</label><input type="search" id="pbSearch" placeholder="Name or USN"></div>' +
      '<div><label for="pbSection">Section</label><select id="pbSection"><option value="">All sections</option></select></div>' +
      '<div><label for="pbStatus">Part B status</label><select id="pbStatus"><option value="">All</option><option value="yes">Granted</option><option value="no">Not granted</option></select></div></div>' +
      '<div class="fx-bulk"><label style="display:flex;gap:8px;align-items:center;font-weight:700"><input type="checkbox" class="fx-cb" id="pbAll"> Select all shown</label>' +
      '<span id="pbCount" style="color:var(--dde-ink-3)">0 selected</span>' +
      '<button type="button" class="dde-btn" id="pbGrant">✅ Grant Part B Access</button><button type="button" class="dde-btn is-ghost" id="pbRevoke">⛔ Revoke Part B Access</button>' +
      '<button type="button" class="dde-btn is-ghost" id="pbRefresh">↻ Refresh</button></div><div class="tdb-msg" id="pbMsg" role="status"></div></div>' +
      '<div class="tdb-stats" id="pbStats"></div>' +
      '<div class="dde-card"><div class="tdb-table-wrap"><table class="tdb-table"><thead><tr><th>Select</th><th>Student</th><th>USN</th><th>Section</th><th>Part B</th><th>Granted on</th><th>Granted by</th></tr></thead><tbody id="pbRows"></tbody></table></div></div>';
    $('pbSearch').addEventListener('input', drawPartB); $('pbSection').addEventListener('change', drawPartB); $('pbStatus').addEventListener('change', drawPartB);
    $('pbRefresh').addEventListener('click', loadPartB);
    $('pbAll').addEventListener('change', function () { var on = this.checked; pbShown().forEach(function (r) { if (on) pb.sel[r.usn] = 1; else delete pb.sel[r.usn]; }); drawPartB(); });
    $('pbGrant').addEventListener('click', function () { setAccess(true); });
    $('pbRevoke').addEventListener('click', function () { setAccess(false); });
  }
  function loadPartB() {
    $('pbRows').innerHTML = '<tr><td colspan="7" class="tdb-empty">Loading…</td></tr>';
    rpc('dde_teacher_partb_list').then(function (r) {
      if (!guard(r)) return;
      if (!r || !r.ok) { note($('pbMsg'), 'bad', 'Could not load students (' + ((r && r.error) || 'error') + '). Has progress-partb-capstone.sql been run in Supabase?'); $('pbRows').innerHTML = ''; return; }
      pb.rows = r.students || [];
      var secs = {}; pb.rows.forEach(function (x) { if (x.section) secs[x.section] = 1; });
      var keep = $('pbSection').value;
      $('pbSection').innerHTML = '<option value="">All sections</option>' + Object.keys(secs).sort().map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
      if (secs[keep]) $('pbSection').value = keep;
      drawPartB();
    }, function (e) { note($('pbMsg'), 'bad', 'Could not reach the server: ' + (e && e.message || e)); });
  }
  function pbShown() {
    var q = $('pbSearch').value.trim().toLowerCase(), sec = $('pbSection').value, st = $('pbStatus').value;
    return pb.rows.filter(function (r) {
      if (sec && r.section !== sec) return false;
      if (st && (!!r.granted) !== (st === 'yes')) return false;
      if (q && String(r.name || '').toLowerCase().indexOf(q) < 0 && String(r.usn || '').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
  }
  function drawPartB() {
    var rows = pbShown(), g = pb.rows.filter(function (r) { return r.granted; }).length;
    $('pbStats').innerHTML = [['Registered students', pb.rows.length], ['Part B granted', g], ['Not granted', pb.rows.length - g], ['Shown', rows.length]].map(function (s) { return '<div class="tdb-stat"><span>' + s[0] + '</span><b>' + s[1] + '</b></div>'; }).join('');
    $('pbRows').innerHTML = !pb.rows.length ? '<tr><td colspan="7" class="tdb-empty">No students have registered yet.</td></tr>' : !rows.length ? '<tr><td colspan="7" class="tdb-empty">No students match these filters.</td></tr>' :
      rows.map(function (r) {
        return '<tr><td data-label="Select"><input type="checkbox" class="fx-cb pb-cb" data-usn="' + esc(r.usn) + '" aria-label="Select ' + esc(r.name) + '"' + (pb.sel[r.usn] ? ' checked' : '') + '></td>' +
          '<td class="tdb-name" data-label="Student">' + esc(r.name) + '</td><td data-label="USN">' + esc(r.usn) + '</td><td data-label="Section">' + esc(r.section || '–') + '</td>' +
          '<td data-label="Part B"><span class="fx-pill ' + (r.granted ? 'fx-yes">✅ Granted' : 'fx-no">❌ Not granted') + '</span></td>' +
          '<td data-label="Granted on">' + (r.granted ? o.when(r.granted_at) : '–') + '</td><td data-label="Granted by">' + (r.granted ? esc(r.granted_by || '–') : '–') + '</td></tr>';
      }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.pb-cb'), function (cb) { cb.addEventListener('change', function () { var u = cb.getAttribute('data-usn'); if (cb.checked) pb.sel[u] = 1; else delete pb.sel[u]; count(); }); });
    count();
  }
  function count() {
    var n = Object.keys(pb.sel).length; $('pbCount').textContent = n + ' selected';
    var shown = pbShown(); $('pbAll').checked = shown.length > 0 && shown.every(function (r) { return pb.sel[r.usn]; });
  }
  function setAccess(grant) {
    var usns = Object.keys(pb.sel);
    if (!usns.length) { note($('pbMsg'), 'bad', 'Select at least one student first.'); return; }
    if (!grant && !window.confirm('Revoke Part B access for ' + usns.length + ' student' + (usns.length > 1 ? 's' : '') + '?\n\nThey will no longer be able to open Levels 7–14 or the Final Capstone. Their saved progress is kept.')) return;
    note($('pbMsg'), 'info', 'Saving…');
    rpc('dde_teacher_partb_set', { p_usns: usns, p_grant: grant }).then(function (r) {
      if (!guard(r)) return;
      if (!r || !r.ok) { note($('pbMsg'), 'bad', 'Could not update access (' + ((r && r.error) || 'error') + ').'); return; }
      pb.sel = {}; note($('pbMsg'), 'ok', (grant ? 'Part B access granted to ' : 'Part B access revoked for ') + r.changed + ' student' + (r.changed === 1 ? '' : 's') + '.');
      loadPartB();
    }, function (e) { note($('pbMsg'), 'bad', 'Could not reach the server: ' + (e && e.message || e)); });
  }

  /* ---------- Final Capstone ---------- */
  function capStatus(r) {
    if (!r.stages_started) return ['none', 'Not started'];
    if (r.approved) return ['done', 'Completed'];
    if (r.score != null) return ['eval', 'Evaluated'];
    if (r.submitted_at) return ['sub', 'Submitted'];
    return ['prog', 'In progress'];
  }
  function stageName(r) { var n = Math.min(12, (r.stages_done || 0) + 1); return r.approved ? 'Completed' : r.submitted_at ? 'Faculty evaluation' : n + '. ' + C.STAGES[n - 1].t; }
  function buildCap() {
    $('fxCap').innerHTML = '<div class="dde-card" style="margin-top:18px"><h2 style="margin:0 0 6px;color:var(--dde-navy);font-size:1.15rem">🏆 Final Capstone</h2>' +
      '<p class="sub" style="margin:0 0 10px">Project selection, stage progress, faculty evaluation and final score for every registered student.</p>' +
      '<div class="tdb-filters"><div><label for="cpSearch">Student</label><input type="search" id="cpSearch" placeholder="Name or USN"></div>' +
      '<div><label for="cpSection">Section</label><select id="cpSection"><option value="">All sections</option></select></div>' +
      '<div><label for="cpStatus">Capstone status</label><select id="cpStatus"><option value="">All</option><option value="none">Not started</option><option value="prog">In progress</option><option value="sub">Submitted</option><option value="eval">Evaluated</option><option value="done">Completed</option></select></div>' +
      '<div><label for="cpPartB">Part B access</label><select id="cpPartB"><option value="">All</option><option value="yes">Granted</option><option value="no">Not granted</option></select></div></div>' +
      '<div class="fx-bulk"><button type="button" class="dde-btn" id="cpRefresh">↻ Refresh</button></div><div class="tdb-msg" id="cpMsg" role="status"></div></div>' +
      '<div class="tdb-stats" id="cpStats"></div>' +
      '<div class="dde-card"><div class="tdb-table-wrap"><table class="tdb-table"><thead><tr><th>Student</th><th>USN</th><th>Project</th><th>Type</th><th>Team</th><th>Current stage</th><th>Progress</th><th>Score</th><th>Status</th><th>Submitted</th><th>Updated</th></tr></thead><tbody id="cpRows"></tbody></table></div></div>' +
      '<div class="tdb-modal" id="cpModal" role="dialog" aria-modal="true"><div class="dde-card" id="cpDetail"></div></div>';
    ['cpSearch'].forEach(function (id) { $(id).addEventListener('input', drawCap); });
    ['cpSection', 'cpStatus', 'cpPartB'].forEach(function (id) { $(id).addEventListener('change', drawCap); });
    $('cpRefresh').addEventListener('click', loadCap);
    $('cpModal').addEventListener('click', function (e) { if (e.target === this) closeDetail(); });
  }
  function loadCap() {
    $('cpRows').innerHTML = '<tr><td colspan="11" class="tdb-empty">Loading…</td></tr>';
    rpc('dde_teacher_capstone_list').then(function (r) {
      if (!guard(r)) return;
      if (!r || !r.ok) { note($('cpMsg'), 'bad', 'Could not load capstone data (' + ((r && r.error) || 'error') + ').'); $('cpRows').innerHTML = ''; return; }
      cap.rows = r.students || [];
      var secs = {}; cap.rows.forEach(function (x) { if (x.section) secs[x.section] = 1; });
      var keep = $('cpSection').value;
      $('cpSection').innerHTML = '<option value="">All sections</option>' + Object.keys(secs).sort().map(function (s) { return '<option>' + esc(s) + '</option>'; }).join('');
      if (secs[keep]) $('cpSection').value = keep;
      drawCap();
    }, function (e) { note($('cpMsg'), 'bad', 'Could not reach the server: ' + (e && e.message || e)); });
  }
  function drawCap() {
    var q = $('cpSearch').value.trim().toLowerCase(), sec = $('cpSection').value, st = $('cpStatus').value, pbv = $('cpPartB').value;
    var rows = cap.rows.filter(function (r) {
      if (sec && r.section !== sec) return false;
      if (st && capStatus(r)[0] !== st) return false;
      if (pbv && (!!r.partb_access) !== (pbv === 'yes')) return false;
      if (q && String(r.name || '').toLowerCase().indexOf(q) < 0 && String(r.usn || '').toLowerCase().indexOf(q) < 0) return false;
      return true;
    });
    var c = { none: 0, prog: 0, sub: 0, eval: 0, done: 0 }; rows.forEach(function (r) { c[capStatus(r)[0]]++; });
    $('cpStats').innerHTML = [['Students', rows.length], ['Not started', c.none], ['In progress', c.prog], ['Submitted', c.sub + c.eval], ['Completed', c.done]].map(function (s) { return '<div class="tdb-stat"><span>' + s[0] + '</span><b>' + s[1] + '</b></div>'; }).join('');
    $('cpRows').innerHTML = !cap.rows.length ? '<tr><td colspan="11" class="tdb-empty">No students have registered yet.</td></tr>' : !rows.length ? '<tr><td colspan="11" class="tdb-empty">No students match these filters.</td></tr>' :
      rows.map(function (r) {
        var s = capStatus(r), p = Math.round(100 * (r.stages_done || 0) / 12);
        return '<tr tabindex="0" data-usn="' + esc(r.usn) + '"><td class="tdb-name" data-label="Student">' + esc(r.name) + (r.partb_access ? '' : ' <span class="fx-pill fx-no">no Part B</span>') + '</td>' +
          '<td data-label="USN">' + esc(r.usn) + '</td><td data-label="Project">' + esc(r.title || '–') + '</td><td data-label="Type">' + esc(r.project_type || '–') + '</td><td data-label="Team">' + esc(r.team || '–') + '</td>' +
          '<td data-label="Stage">' + (s[0] === 'none' ? 'Not started' : esc(stageName(r))) + '</td>' +
          '<td data-label="Progress"><div class="tdb-prog"><div class="dde-bar' + (p >= 100 ? ' is-full' : '') + '"><span style="width:' + p + '%"></span></div><b>' + p + '%</b></div></td>' +
          '<td data-label="Score">' + (r.score != null ? esc(r.score) + ' / 100' : '–') + '</td><td data-label="Status"><span class="tdb-st ' + (s[0] === 'done' ? 'done' : s[0] === 'none' ? 'none' : 'prog') + '">' + s[1] + '</span></td>' +
          '<td data-label="Submitted">' + (r.submitted_at ? o.when(r.submitted_at) : '–') + '</td><td data-label="Updated">' + o.when(r.updated_at) + '</td></tr>';
      }).join('');
    Array.prototype.forEach.call($('cpRows').querySelectorAll('tr[data-usn]'), function (tr) {
      var go = function () { openDetail(tr.getAttribute('data-usn')); };
      tr.addEventListener('click', go); tr.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }
  function closeDetail() { $('cpModal').classList.remove('is-open'); $('cpModal').style.display = ''; }
  function openDetail(usn) {
    var m = $('cpModal'), d = $('cpDetail');
    d.innerHTML = '<p>Loading…</p>'; m.classList.add('is-open'); m.style.display = 'flex';
    rpc('dde_teacher_capstone_get', { p_usn: usn }).then(function (r) {
      if (!guard(r)) return;
      if (!r || !r.ok) { d.innerHTML = '<p>Could not load (' + esc(r && r.error) + ').</p>'; return; }
      var st = {}; (r.stages || []).forEach(function (x) { st[x.stage] = x; });
      var ev = r.evaluation || {}, sc = ev.scores || {}, submitted = !!(st[12] && st[12].completed), row = cap.rows.filter(function (x) { return x.usn === usn; })[0] || {};
      var h = '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><div><h2 style="margin:0;color:var(--dde-navy)">' + esc(r.student.name) + ' · ' + esc(r.student.usn) + '</h2>' +
        '<p class="sub" style="margin:4px 0">Section ' + esc(r.student.section || '–') + ' · Part B ' + (r.partb_access ? '✅ granted' : '❌ not granted') + ' · Part B modules completed: ' + (row.partb_modules_completed || 0) + '</p></div>' +
        '<button type="button" class="dde-btn is-ghost" id="cpClose">✕ Close</button></div>';
      h += C.STAGES.map(function (s) {
        var x = st[s.n], dd = (x && x.details) || {};
        return '<div class="fx-stage"><b>' + s.icon + ' ' + s.n + '. ' + esc(s.t) + '</b> ' + (x && x.completed ? '<span class="fx-pill fx-yes">complete</span>' : x ? '<span class="fx-pill fx-no">draft</span>' : '<span class="fx-pill fx-no">not started</span>') +
          (x ? s.f.map(function (f) { var v = dd[f.k]; if (v == null || v === '' || (Array.isArray(v) && !v.length)) return ''; return '<p><b>' + esc(f.l) + ':</b> ' + esc(Array.isArray(v) ? v.join(', ') : v).replace(/\n/g, '<br>') + '</p>'; }).join('') : '') + '</div>';
      }).join('');
      h += '<h3>Evaluation rubric</h3>' + (submitted ? '' : '<p class="tdb-msg is-info" style="display:block">The student has not submitted yet. You can save provisional marks, but approval requires a submitted project.</p>') +
        '<div class="fx-rub">' + C.RUBRIC.map(function (k) { return '<label for="rb_' + k[0] + '">' + esc(k[1]) + ' (max ' + k[2] + ')</label><input type="number" inputmode="decimal" min="0" max="' + k[2] + '" step="0.5" id="rb_' + k[0] + '" value="' + (sc[k[0]] != null ? sc[k[0]] : '') + '">'; }).join('') +
        '<b>Total</b><b id="rbTotal">0 / 100</b></div>' +
        '<label for="rbComments" style="display:block;margin-top:10px;font-weight:700">Comments to the student</label><textarea id="rbComments" rows="3" style="width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:8px;border:1px solid var(--dde-line);border-radius:8px">' + esc(ev.comments || '') + '</textarea>' +
        '<label style="display:flex;gap:8px;align-items:center;margin:10px 0;font-weight:700"><input type="checkbox" class="fx-cb" id="rbApprove"' + (ev.approved ? ' checked' : '') + (submitted ? '' : ' disabled') + '> Approve project (marks the Final Capstone as completed)</label>' +
        '<div class="fx-bulk"><button type="button" class="dde-btn" id="rbSave">💾 Save evaluation</button></div><div class="tdb-msg" id="rbMsg" role="status"></div>' +
        (ev.evaluated_at ? '<p class="sub">Last evaluated ' + o.when(ev.evaluated_at) + ' by ' + esc(ev.evaluated_by || '–') + (ev.approved ? ' · ✅ approved' : '') + '</p>' : '');
      d.innerHTML = h;
      var total = function () { var t = 0; C.RUBRIC.forEach(function (k) { t += Math.min(k[2], Math.max(0, parseFloat($('rb_' + k[0]).value) || 0)); }); $('rbTotal').textContent = t + ' / 100'; };
      C.RUBRIC.forEach(function (k) { $('rb_' + k[0]).addEventListener('input', total); }); total();
      $('cpClose').addEventListener('click', closeDetail);
      $('rbSave').addEventListener('click', function () {
        var scores = {}, bad = null;
        C.RUBRIC.forEach(function (k) { var v = parseFloat($('rb_' + k[0]).value) || 0; if (v < 0 || v > k[2]) bad = k[1]; scores[k[0]] = v; });
        if (bad) { note($('rbMsg'), 'bad', bad + ': score is outside the allowed range.'); return; }
        note($('rbMsg'), 'info', 'Saving…');
        rpc('dde_teacher_capstone_evaluate', { p_usn: usn, p_scores: scores, p_comments: $('rbComments').value, p_approve: $('rbApprove').checked }).then(function (x) {
          if (!guard(x)) return;
          if (!x || !x.ok) { note($('rbMsg'), 'bad', x && x.error === 'not_submitted' ? 'The project must be submitted before it can be approved.' : 'Could not save (' + ((x && x.error) || 'error') + ').'); return; }
          note($('rbMsg'), 'ok', 'Evaluation saved: ' + x.total + ' / 100' + (x.approved ? ' · approved ✅' : '') + '.');
          loadCap();
        }, function (e) { note($('rbMsg'), 'bad', 'Could not reach the server.'); });
      });
    });
  }

  window.DDEFaculty = {
    init: function (opts) {
      o = opts; if (this.started || !$('fxTabs') || !window.DDEProgress || !C) return;
      this.started = true;
      buildPartB(); buildCap();
      $('fxTabs').hidden = false;
      Array.prototype.forEach.call(document.querySelectorAll('.fx-tab'), function (b) { b.addEventListener('click', function () { tab(b.getAttribute('data-tab')); }); });
      var t = null; try { t = sessionStorage.getItem('ddeFacultyTab'); } catch (e) {}
      if (t && t !== 'progress') tab(t);
    }
  };
})();
