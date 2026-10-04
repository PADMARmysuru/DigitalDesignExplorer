/* Level 11 · Module 4 – Assertions & SVA */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var DELAYS = [['0', 'nothing (same/next cycle only)', 0, 0], ['1', '##1', 1, 1], ['13', '##[1:3]', 1, 3], ['0inf', '##[0:$]', 0, 99]];
  var REQS = [
    { text: 'Every request <b>req</b> must be acknowledged by <b>ack</b> within 1 to 3 clock cycles.',
      sig: ['req', 'ack'], ante: [['req', 'req', function (s, t) { return s.req[t]; }], ['ack', 'ack', function (s, t) { return s.ack[t]; }], ['!req', '!req', function (s, t) { return !s.req[t]; }]],
      cons: [['ack', 'ack', function (s, t) { return s.ack[t]; }], ['req', 'req', function (s, t) { return s.req[t]; }], ['!ack', '!ack', function (s, t) { return !s.ack[t]; }]],
      traces: [{ n: 'ack after 2 cycles', exp: true, req: [0, 1, 0, 0, 0, 0, 1, 0, 0, 0], ack: [0, 0, 0, 1, 0, 0, 0, 1, 0, 0] }, { n: 'ack never comes', exp: false, req: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0], ack: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, { n: 'ack after 5 cycles (too late)', exp: false, req: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0], ack: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0] }],
      best: 'assert property (@(posedge clk) req |-> ##[1:3] ack);' },
    { text: 'After a write <b>wr</b>, the FIFO must not be <b>empty</b> in the following cycle.',
      sig: ['wr', 'empty'], ante: [['wr', 'wr', function (s, t) { return s.wr[t]; }], ['empty', 'empty', function (s, t) { return s.empty[t]; }], ['!wr', '!wr', function (s, t) { return !s.wr[t]; }]],
      cons: [['!empty', '!empty', function (s, t) { return !s.empty[t]; }], ['empty', 'empty', function (s, t) { return s.empty[t]; }], ['wr', 'wr', function (s, t) { return s.wr[t]; }]],
      traces: [{ n: 'correct FIFO', exp: true, wr: [0, 1, 0, 0, 1, 1, 0, 0, 0, 0], empty: [1, 1, 0, 0, 0, 0, 0, 0, 1, 1] }, { n: 'empty flag stuck high', exp: false, wr: [0, 1, 0, 0, 0, 0, 0, 0, 0, 0], empty: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] }, { n: 'flag updates one cycle late', exp: false, wr: [0, 0, 1, 0, 0, 0, 0, 0, 0, 0], empty: [1, 1, 1, 1, 0, 0, 0, 0, 0, 0] }],
      best: 'assert property (@(posedge clk) wr |=> !empty);' },
    { text: 'Handshake rule: while <b>valid</b> is high and <b>ready</b> is low, <b>valid</b> must still be high in the next cycle (no withdrawing a request).',
      sig: ['valid', 'ready'], ante: [['valid && !ready', 'valid && !ready', function (s, t) { return s.valid[t] && !s.ready[t]; }], ['valid', 'valid', function (s, t) { return s.valid[t]; }], ['ready', 'ready', function (s, t) { return s.ready[t]; }]],
      cons: [['valid', 'valid', function (s, t) { return s.valid[t]; }], ['ready', 'ready', function (s, t) { return s.ready[t]; }], ['!valid', '!valid', function (s, t) { return !s.valid[t]; }]],
      traces: [{ n: 'valid held until ready', exp: true, valid: [0, 1, 1, 1, 0, 1, 0, 0, 0, 0], ready: [0, 0, 0, 1, 0, 1, 0, 0, 0, 0] }, { n: 'valid dropped early', exp: false, valid: [0, 1, 1, 0, 0, 0, 0, 0, 0, 0], ready: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, { n: 'single-cycle transfer', exp: true, valid: [0, 1, 0, 0, 1, 0, 0, 0, 0, 0], ready: [0, 1, 0, 0, 1, 0, 0, 0, 0, 0] }],
      best: 'assert property (@(posedge clk) valid && !ready |=> valid);' }
  ];
  function check(rq, a, imp, d, c, tr) {
    var A = rq.ante.filter(function (x) { return x[0] === a; })[0][2], C = rq.cons.filter(function (x) { return x[0] === c; })[0][2], dd = DELAYS.filter(function (x) { return x[0] === d; })[0], off = imp === '|=>' ? 1 : 0, N = tr[rq.sig[0]].length;
    for (var t = 0; t < N; t++) {
      if (!A(tr, t)) continue;
      var ok = false, any = false;
      for (var k = dd[2]; k <= dd[3]; k++) { var u = t + off + k; if (u >= N) break; any = true; if (C(tr, u)) { ok = true; break; } }
      if (!any) continue;                          // end of trace: not decided
      if (!ok) return { pass: false, at: t };
    }
    return { pass: true };
  }

  /* ---------- Widget: assertion builder ---------- */
  function builder(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Assertion builder · build each property and test it on three waveforms</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = 0, solved = {}, sel = REQS.map(function (r) { return { a: r.ante[1][0], imp: '|->', d: '0', c: r.cons[1][0] }; });
    var tabs = L.h('div', 'l7-row'); body.appendChild(tabs);
    var view = L.h('div', ''); body.appendChild(view);
    function draw() {
      tabs.innerHTML = '';
      REQS.forEach(function (r, i) { tabs.appendChild(L.btn((solved[i] ? '✓ ' : '') + 'Requirement ' + (i + 1), i === cur ? 'is-on' : '', function () { cur = i; draw(); })); });
      var rq = REQS[cur], s = sel[cur]; view.innerHTML = '';
      view.appendChild(L.h('div', 'l7-readout', rq.text));
      var row = L.h('div', 'l7-row'); view.appendChild(row);
      L.select(row, 'Antecedent', rq.ante.map(function (x) { return [x[0], x[1]]; }), s.a, function (v) { s.a = v; draw(); });
      L.select(row, 'Implication', [['|->', '|-> (same cycle)'], ['|=>', '|=> (next cycle)']], s.imp, function (v) { s.imp = v; draw(); });
      L.select(row, 'Delay', DELAYS.map(function (x) { return [x[0], x[1]]; }), s.d, function (v) { s.d = v; draw(); });
      L.select(row, 'Consequent', rq.cons.map(function (x) { return [x[0], x[1]]; }), s.c, function (v) { s.c = v; draw(); });
      var dl = DELAYS.filter(function (x) { return x[0] === s.d; })[0][1];
      view.appendChild(L.h('div', '', L.code('assert property (@(posedge clk) ' + s.a + ' ' + s.imp + (s.d === '0' ? ' ' : ' ' + dl + ' ') + s.c + ');')));
      var allMatch = true, o = '', W = 40, y0 = 10;
      rq.traces.forEach(function (tr, ti) {
        var r = check(rq, s.a, s.imp, s.d, s.c, tr), match = r.pass === tr.exp; if (!match) allMatch = false;
        var y = y0 + ti * 96;
        o += T(4, y + 12, (ti + 1) + '. ' + tr.n + ' – expected ' + (tr.exp ? 'PASS' : 'FAIL'), 't-ink t-b t-sm', 'start');
        rq.sig.forEach(function (sg, si) {
          var yy = y + 24 + si * 30, d = 'M90 ' + (yy + 18);
          tr[sg].forEach(function (v, t) { d += 'V' + (yy + (v ? 2 : 18)) + 'H' + (90 + (t + 1) * W); });
          o += T(84, yy + 14, sg, 't-dim t-sm', 'end') + P(d, si ? 'w-cu' : 'w-on');
        });
        if (!r.pass) o += '<rect x="' + (90 + r.at * W) + '" y="' + (y + 22) + '" width="' + W + '" height="60" fill="rgba(255,59,48,.15)" stroke="#ff3b30"/>';
        o += T(520, y + 50, r.pass ? 'assertion PASS' : 'assertion FAIL', r.pass ? 't-ok t-b t-sm' : 't-bad t-b t-sm', 'start') + T(520, y + 68, match ? '✓ as expected' : '✗ not expected', match ? 't-ok t-sm' : 't-bad t-sm', 'start');
      });
      view.appendChild(L.h('div', 'l7-svgbox', S(640, 300, o, 'Assertion results on three traces')));
      var fb = L.h('div', 'l7-verdict ' + (allMatch ? 'ok' : 'bad')); view.appendChild(fb);
      if (allMatch) {
        solved[cur] = 1;
        fb.innerHTML = '✅ Correct property<small>It passes the good waveforms and catches the bad ones. Reference: <code>' + L.esc(rq.best) + '</code>' + (Object.keys(solved).length === 3 ? ' 🎉 All three requirements done.' : '') + '</small>';
        if (Object.keys(solved).length === 3) api.done();
        tabs.innerHTML = ''; REQS.forEach(function (r, i) { tabs.appendChild(L.btn((solved[i] ? '✓ ' : '') + 'Requirement ' + (i + 1), i === cur ? 'is-on' : '', function () { cur = i; draw(); })); });
      } else fb.innerHTML = '❌ The property does not match the requirement<small>A good assertion must PASS on correct behaviour and FAIL on every violation. Red boxes show where it fired.</small>';
    }
    draw();
  }

  function seqFrame(k) {
    var o = '', W = 50, req = [0, 1, 0, 0, 0, 0, 0, 0], ack = [0, 0, 0, 1, 0, 0, 0, 0];
    [['clk', null], ['req', req], ['ack', ack]].forEach(function (r, i) {
      var y = 30 + i * 40, d = 'M80 ' + (y + 20);
      if (!r[1]) { for (var t = 0; t < 8; t++) d += 'V' + y + 'H' + (80 + t * W + W / 2) + 'V' + (y + 20) + 'H' + (80 + (t + 1) * W); o += P(d, 'wv-clk'); }
      else { r[1].forEach(function (v, t) { d += 'V' + (y + (v ? 0 : 20)) + 'H' + (80 + (t + 1) * W); }); o += P(d, 'w-on'); }
      o += T(70, y + 15, r[0], 't-dim t-sm', 'end');
    });
    if (k >= 1) o += '<rect x="' + (80 + W) + '" y="20" width="' + W + '" height="120" fill="rgba(0,113,227,.12)"/>' + T(80 + 1.5 * W, 158, 'antecedent', 't-sig t-sm');
    if (k >= 2) o += '<rect x="' + (80 + 2 * W) + '" y="20" width="' + 3 * W + '" height="120" fill="rgba(255,149,0,.12)"/>' + T(80 + 3.5 * W, 158, 'window ##[1:3]', 't-cu t-sm');
    if (k >= 3) o += '<circle cx="' + (80 + 3.5 * W) + '" cy="' + 110 + '" r="12" fill="none" stroke="#34c759" stroke-width="3"/>' + T(80 + 3.5 * W, 176, 'ack seen in window → property passes', 't-ok t-b t-sm');
    o += T(320, 12, ['A concurrent assertion is checked at every clock edge', 'At each edge where req = 1, an attempt starts', 'The consequent must hold somewhere in the window', 'The attempt succeeds; a missing ack would fail and point to the cycle'][k], 't-vio t-b t-sm');
    return S(600, 186, o, 'Assertion evaluation');
  }

  L.module({
    n: 4,
    lead: 'Assertions turn the specification\'s timing rules into executable checks that watch the design on every clock edge – during every simulation, every regression and even formal analysis. Learn to write properties that are exactly as strict as the requirement.',
    tags: ['immediate assertions', 'concurrent assertions', 'properties', 'sequences', 'temporal operators', 'clocking', 'protocol checks', 'ABV'],
    sections: [
      {
        id: 'c-abv', type: 'concept', title: 'Assertion-based verification (ABV)', nav: 'ABV',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>Immediate assertions</h4><p>Checked when executed in procedural code, like an <code>if</code>: <code>assert (fifo_cnt &lt;= 16) else $error(...)</code>.</p></div><div class="l7-box cu"><h4>Concurrent assertions</h4><p>Describe behaviour over time and are evaluated at every clock edge: <code>assert property (@(posedge clk) a |=> b);</code></p></div></div>' +
          '<p style="margin-top:12px">Why ABV: the bug is reported <b>where and when</b> it happens (not 10,000 cycles later at the output), every test checks the protocol automatically, and the same properties can be proved by formal tools. (Basic SVA syntax: Level 6 Module 7.)</p>'
      },
      {
        id: 'st-seq', type: 'steps', title: 'Animation: how a concurrent assertion is evaluated', nav: 'Evaluation',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Sampled at each clock edge.', 'The <b>antecedent</b> (left of the implication) starts an attempt.', 'The <b>consequent</b> is checked in the time window given by the delay.', 'Success or failure is reported at the exact cycle.'][k], svg: seqFrame(k) }; })
      },
      {
        id: 'c-ops', type: 'concept', title: 'Sequences, properties and temporal operators', nav: 'Operators',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Operator</th><th>Meaning</th></tr><tr><td><code>a |-> b</code></td><td>if a, then b in the same cycle</td></tr><tr><td><code>a |=> b</code></td><td>if a, then b in the next cycle</td></tr><tr><td><code>##n</code>, <code>##[m:n]</code></td><td>delay of n cycles / between m and n cycles</td></tr><tr><td><code>[*n]</code></td><td>repeat n consecutive cycles</td></tr><tr><td><code>$rose(x)</code>, <code>$fell(x)</code>, <code>$stable(x)</code></td><td>edge and stability functions</td></tr><tr><td><code>disable iff (rst)</code></td><td>ignore during reset</td></tr></table></div>'
      },
      { id: 'w-sva', type: 'widget', title: 'Assertion builder', nav: 'Assertion builder', intro: 'For each requirement, assemble the property. It must pass the good waveforms and fail the bad ones.', build: builder },
      {
        id: 'rv-4', type: 'reveal', title: 'Click to reveal: assertion insights', nav: 'Reveal',
        items: [
          { q: 'What is a vacuous pass?', a: 'If the antecedent never occurs, the property "passes" without checking anything. Cover properties (cover property) confirm the antecedent really happens.' },
          { q: 'Why add disable iff (rst)?', a: 'During reset signals are undefined; without it assertions fire false failures.' },
          { q: 'Who should write assertions?', a: 'Designers add internal assumptions (e.g. FIFO never overflows); verification engineers add interface protocol checks.' },
          { q: 'Are assertions synthesizable?', a: 'Not as normal logic, but they can be compiled into emulators or used by formal tools.' }
        ]
      },
      {
        id: 'dd-4', type: 'drag', title: 'Drag & drop: which operator?', nav: 'Drag & drop',
        bins: ['|->', '|=>', '##[1:3]', '$stable'],
        items: [['b must hold in the same cycle as a', 0], ['b must hold one cycle after a', 1], ['response within one to three cycles', 2], ['data must not change while waiting', 3]]
      },
      {
        id: 'mcq4', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: '<code>a |=> b</code> means…', o: ['if a, then b in the next cycle', 'if a, then b in the same cycle', 'a and b always equal', 'b before a'], a: 0, w: '' },
          { q: 'Concurrent assertions are evaluated…', o: ['at every clock edge', 'only at time 0', 'only at the end', 'never in simulation'], a: 0, w: '' },
          { q: 'A vacuous pass happens when…', o: ['the antecedent never occurs', 'the consequent is true', 'the clock is fast', 'coverage is 100 %'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen4', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'The assertion <code>req |-> ##[1:3] ack</code> never fails in 10,000 tests – but req was never driven high.', q: 'What should you add?', o: [{ t: 'A cover property on req (or req ##[1:3] ack) to prove the scenario happens', ok: true, w: 'Prevents vacuous success.' }, { t: 'Nothing – no failures means correct', ok: false, w: 'It was never checked.' }, { t: 'Remove the assertion', ok: false, w: 'It is useful once exercised.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'An immediate assertion is…', o: ['checked when the procedural statement executes', 'checked every clock edge', 'a cover property', 'synthesised logic'], a: 0, w: '' },
      { d: 'Easy', q: '|-> means…', o: ['overlapping implication (same cycle)', 'next-cycle implication', 'repetition', 'disable'], a: 0, w: '' },
      { d: 'Easy', q: 'ABV reports bugs…', o: ['where and when they occur', 'only at the outputs', 'after tape-out', 'never'], a: 0, w: '' },
      { d: 'Medium', q: '##[2:4] means…', o: ['between 2 and 4 cycles later', 'exactly 3 cycles', 'repeat 2 to 4 times', '2 or 4 only'], a: 0, w: '' },
      { d: 'Medium', q: 'Which checks that data does not change?', o: ['$stable(data)', '$rose(data)', '$fell(data)', 'data |-> 0'], a: 0, w: '' },
      { d: 'Medium', q: 'disable iff (rst) is used to…', o: ['ignore checks during reset', 'reset the DUT', 'speed up simulation', 'add coverage'], a: 0, w: '' },
      { d: 'Medium', q: 'Requirement: "after wr, not empty next cycle" →', o: ['wr |=> !empty', 'wr |-> empty', '!empty |-> wr', 'wr ##5 empty'], a: 0, w: '' },
      { d: 'Hard', q: 'Why use cover property alongside assert property?', o: ['to confirm the scenario actually occurred (avoid vacuous passes)', 'to make the assertion faster', 'to synthesise it', 'to replace the scoreboard'], a: 0, w: '' },
      { d: 'Hard', q: '<code>valid && !ready |=> valid</code> enforces…', o: ['a request cannot be withdrawn before it is accepted', 'ready must rise', 'valid toggles every cycle', 'nothing'], a: 0, w: '' },
      { d: 'Hard', q: 'The same SVA properties can also be used by…', o: ['formal verification tools', 'place-and-route', 'ATPG only', 'the GDSII writer'], a: 0, w: '' }
    ]
  });
})();
