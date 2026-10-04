/* Level 13 · Module 3 – Branch Prediction */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* Branch traces: [pc, taken] */
  function loopTrace() { var t = []; for (var r = 0; r < 6; r++) { for (var i = 0; i < 7; i++) t.push([0, 1]); t.push([0, 0]); } return t; }
  function altTrace() { var t = []; for (var i = 0; i < 48; i++) t.push([1, i % 2 === 0 ? 1 : 0]); return t; }
  function corrTrace() { var t = [], seq = [1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0]; for (var r = 0; r < 2; r++) seq.forEach(function (b) { t.push([2, b]); t.push([3, b]); }); return t; }   // B2 repeats B1's outcome
  var TRACES = { loop: ['Loop branch (7 × taken, 1 × not taken)', loopTrace()], alt: ['Alternating branch (T, N, T, N…)', altTrace()], corr: ['Correlated branches (B2 does what B1 did)', corrTrace()] };

  var PRED = {
    always: { n: 'Always taken', make: function () { return { p: function () { return 1; }, u: function () {} }; } },
    one: { n: '1-bit', make: function () { var b = 1; return { p: function () { return b; }, u: function (pc, t) { b = t; } }; } },
    two: { n: '2-bit counter', make: function () { var c = 2; return { p: function () { return c >= 2 ? 1 : 0; }, u: function (pc, t) { c = t ? Math.min(3, c + 1) : Math.max(0, c - 1); } }; } },
    bimodal: { n: 'Bimodal (2-bit per PC)', make: function () { var tb = {}; return { p: function (pc) { return (tb[pc] == null ? 2 : tb[pc]) >= 2 ? 1 : 0; }, u: function (pc, t) { var c = tb[pc] == null ? 2 : tb[pc]; tb[pc] = t ? Math.min(3, c + 1) : Math.max(0, c - 1); } }; } },
    gshare: { n: 'Gshare (4-bit global history ⊕ PC)', make: function () { var tb = {}, h = 0; var ix = function (pc) { return (pc ^ h) & 15; }; return { p: function (pc) { var c = tb[ix(pc)]; return (c == null ? 2 : c) >= 2 ? 1 : 0; }, u: function (pc, t) { var i = ix(pc), c = tb[i] == null ? 2 : tb[i]; tb[i] = t ? Math.min(3, c + 1) : Math.max(0, c - 1); h = ((h << 1) | t) & 15; } }; } }
  };
  function run(pk, trace) {
    var m = PRED[pk].make(), res = [];
    trace.forEach(function (b) { var p = m.p(b[0]); res.push([b[0], p, b[1]]); m.u(b[0], b[1]); });
    var ok = res.filter(function (r) { return r[1] === r[2]; }).length;
    return { res: res, ok: ok, miss: res.length - ok, acc: 100 * ok / res.length };
  }

  /* ---------- Widget: branch predictor simulator ---------- */
  function bpLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Branch predictor simulator</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var tr = 'loop', pk = 'two', ran = {}, done = false, answered = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    L.select(row, 'Branch trace', Object.keys(TRACES).map(function (k) { return [k, TRACES[k][0]]; }), tr, function (v) { tr = v; draw(); });
    L.select(row, 'Predictor', Object.keys(PRED).map(function (k) { return [k, PRED[k].n]; }), pk, function (v) { pk = v; draw(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var cmp = L.h('div', 'l7-table-wrap'); body.appendChild(cmp);
    var qbox = L.h('div', ''); body.appendChild(qbox);
    function draw() {
      var T0 = TRACES[tr][1], r = run(pk, T0), o = '', N = T0.length, W = Math.min(24, 560 / Math.min(N, 24));
      ran[tr + pk] = 1;
      r.res.slice(0, 48).forEach(function (x, i) {
        var col = i % 24, rowi = Math.floor(i / 24), X = 10 + col * W, Y = 14 + rowi * 70;
        o += R(X, Y, W - 3, 22, x[1] ? 'box-on' : 'box', 4) + T(X + (W - 3) / 2, Y + 15, x[1] ? 'T' : 'N', 't-ink t-sm');
        o += R(X, Y + 26, W - 3, 22, x[2] ? 'box-on' : 'box', 4) + T(X + (W - 3) / 2, Y + 41, x[2] ? 'T' : 'N', 't-ink t-sm');
        o += T(X + (W - 3) / 2, Y + 62, x[1] === x[2] ? '✓' : '✗', x[1] === x[2] ? 't-ok t-sm' : 't-bad t-b t-sm');
      });
      o += T(590, 30, 'predicted', 't-dim t-sm', 'end') + T(590, 56, 'actual', 't-dim t-sm', 'end');
      pic.innerHTML = S(600, N > 24 ? 156 : 86, o, 'Predictions vs outcomes');
      out.innerHTML = '<span class="k">' + PRED[pk].n + ' on ' + TRACES[tr][0] + '</span><br><span class="k">branches</span> ' + N + ' · <span class="k">correct</span> <span class="v">' + r.ok + '</span> · <span class="k">mispredictions</span> <span class="c">' + r.miss + '</span> · <span class="k">accuracy</span> <b>' + r.acc.toFixed(1) + ' %</b>';
      cmp.innerHTML = '<table class="l7-cmp"><tr><th>Predictor</th>' + Object.keys(TRACES).map(function (k) { return '<th>' + TRACES[k][0].split(' (')[0] + '</th>'; }).join('') + '</tr>' +
        Object.keys(PRED).map(function (p) { return '<tr><td>' + PRED[p].n + '</td>' + Object.keys(TRACES).map(function (k) { return '<td>' + (ran[k + p] ? run(p, TRACES[k][1]).acc.toFixed(0) + ' %' : '–') + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
      var all = Object.keys(TRACES).every(function (k) { return Object.keys(PRED).every(function (p) { return ran[k + p]; }); });
      if (all && !answered) {
        qbox.innerHTML = '<p><b>Question:</b> Why does gshare beat the 2-bit and bimodal predictors on the alternating and correlated traces?</p>';
        var ch = L.h('div', 'l7-choice'); ch.style.gridTemplateColumns = '1fr'; qbox.appendChild(ch);
        var fb = L.h('div', 'l7-fb'); qbox.appendChild(fb);
        [['Its global history captures patterns and correlations between recent branch outcomes', 1], ['It has more counters, so it is always more accurate', 0], ['It predicts taken more often', 0]].forEach(function (op) {
          var b = L.h('button', '', op[0]); b.type = 'button';
          b.addEventListener('click', function () { if (op[1]) { answered = true; b.classList.add('is-right'); L.fb(fb, 'ok', '✓ The history bits select a different counter for each recent pattern, so "T after N" and "N after T" learn separately. 🎉 Lab complete.'); if (!done) { done = true; api.done(); } } else { b.classList.add('is-wrong'); L.fb(fb, 'bad', '✗ Compare the loop trace: gshare is not always the best.'); } });
          ch.appendChild(b);
        });
      } else if (!all) qbox.innerHTML = '<p class="l7-hint">Run every predictor on every trace to fill the comparison table (' + Object.keys(ran).length + ' of 15).</p>';
    }
    draw();
  }

  function fsmFrame(k) {
    var o = '', st = [['11', 'strongly taken'], ['10', 'weakly taken'], ['01', 'weakly not taken'], ['00', 'strongly not taken']];
    st.forEach(function (s, i) { var x = 40 + i * 140; o += '<circle cx="' + (x + 50) + '" cy="70" r="40" fill="' + (i < 2 ? 'rgba(52,199,89,.2)' : 'rgba(255,59,48,.15)') + '" stroke="' + (i === k ? '#0071e3' : '#c7c7cc') + '" stroke-width="' + (i === k ? 4 : 2) + '"/>' + T(x + 50, 66, s[0], 't-ink t-b') + T(x + 50, 84, s[1], 't-dim t-sm'); });
    o += T(300, 140, ['Predict taken; a taken branch keeps it here', 'One not-taken moves here – still predicts taken', 'A second not-taken flips the prediction', 'Predict not taken until two taken branches arrive'][k], 't-vio t-b t-sm');
    return S(600, 156, o, '2-bit counter');
  }

  L.module({
    n: 3,
    lead: 'A deep pipeline fetches instructions long before a branch is resolved. Branch predictors guess the direction so the pipeline keeps flowing – and modern ones are right more than 95 % of the time. Compare five predictors on real branch patterns.',
    tags: ['branch penalty', 'static prediction', '1-bit', '2-bit', 'bimodal', 'local & global history', 'two-level', 'gshare', 'tournament', 'TAGE'],
    sections: [
      {
        id: 'c-pen', type: 'concept', title: 'Branch penalty and static prediction', nav: 'Branch penalty',
        html: '<div class="l7-eq">CPI = CPI_base + branch frequency × misprediction rate × penalty</div><p>With 20 % branches, a 15-cycle penalty and 10 % mispredictions, CPI rises by 0.3. <b>Static</b> prediction is fixed in hardware or by the compiler (always taken, backward-taken/forward-not-taken). <b>Dynamic</b> prediction learns from history at run time.</p>'
      },
      {
        id: 'st-fsm', type: 'steps', title: 'Animation: the 2-bit saturating counter', nav: '2-bit counter',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['State 11: strongly taken.', 'A single surprise only weakens the prediction (hysteresis).', 'Two not-taken outcomes in a row flip it.', 'This avoids the 1-bit predictor\'s two mispredictions per loop exit.'][k], svg: fsmFrame(k) }; })
      },
      { id: 'w-bp', type: 'widget', title: 'Branch predictor simulator', nav: 'Predictor lab', intro: 'Run all five predictors on all three traces, compare accuracy, then answer the question.', build: bpLab },
      {
        id: 'c-adv', type: 'concept', title: 'Advanced predictors', nav: 'Advanced',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Predictor</th><th>Idea</th></tr><tr><td>Bimodal</td><td>table of 2-bit counters indexed by branch address</td></tr><tr><td>Local history</td><td>each branch\'s own recent pattern selects a counter</td></tr><tr><td>Global history / two-level</td><td>the last n outcomes of all branches select a counter</td></tr><tr><td>Gshare</td><td>global history XOR PC indexes one table – cheap and effective</td></tr><tr><td>Tournament</td><td>a chooser picks between a local and a global predictor per branch</td></tr><tr><td>TAGE (concept)</td><td>several tables with geometrically longer histories; the longest matching history wins</td></tr></table></div>'
      },
      {
        id: 'rv-3', type: 'reveal', title: 'Click to reveal: predictor insights', nav: 'Reveal',
        items: [
          { q: 'Why does a 1-bit predictor mispredict twice per loop?', a: 'At loop exit it mispredicts, flips to not-taken, then mispredicts again when the loop starts next time.' },
          { q: 'What is aliasing in predictor tables?', a: 'Different branches mapping to the same counter and disturbing each other.' },
          { q: 'Why not use a huge history?', a: 'Tables grow exponentially and take longer to train; TAGE uses several history lengths instead.' },
          { q: 'Where does the target address come from?', a: 'A branch target buffer (BTB) caches targets so fetch can redirect immediately.' }
        ]
      },
      {
        id: 'dd-3', type: 'drag', title: 'Drag & drop: which predictor idea?', nav: 'Drag & drop',
        bins: ['Static', 'Per-branch (bimodal / local)', 'Global history (gshare / two-level)'],
        items: [['backward taken, forward not taken', 0], ['always predict taken', 0], ['2-bit counter per PC', 1], ['each branch\'s own pattern', 1], ['XOR of history and PC', 2], ['correlation between different branches', 2]]
      },
      {
        id: 'calc3', type: 'calc', title: 'Prediction calculations', nav: 'Calculate',
        items: [
          { q: 'Loop of 8 iterations (7 taken, 1 not) repeated: 1-bit predictor mispredictions per loop execution (steady state)?', a: 2, h: 'Exit and re-entry.', s: '<b>2</b>.' },
          { q: 'Same loop with a 2-bit counter (steady state)?', a: 1, h: 'Only the exit.', s: '<b>1</b>.' },
          { q: 'CPI_base 1, 20 % branches, 8 % mispredicted, penalty 12 cycles. CPI (two decimals)?', a: 1.19, tol: 0.01, h: '1 + 0.2 × 0.08 × 12.', s: '<b>1.19</b>.' }
        ]
      },
      {
        id: 'mcq3', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'A 2-bit counter needs… mispredictions in a row to change its prediction', o: ['2', '1', '3', '4'], a: 0, w: '' },
          { q: 'Gshare indexes its table with…', o: ['global history XOR PC', 'PC only', 'random bits', 'the opcode'], a: 0, w: '' },
          { q: 'A tournament predictor…', o: ['chooses between two predictors per branch', 'always predicts taken', 'has no tables', 'only predicts loops'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen3', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Profiling shows most mispredictions come from a branch whose outcome equals that of a branch three instructions earlier.', q: 'Which predictor helps most?', o: [{ t: 'A global-history predictor such as gshare', ok: true, w: 'It captures correlation between branches.' }, { t: 'A larger bimodal table', ok: false, w: 'Per-branch counters cannot see the other branch.' }, { t: 'Always taken', ok: false, w: 'No learning.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Branch prediction reduces…', o: ['control-hazard stalls', 'cache misses', 'register count', 'area'], a: 0, w: '' },
      { d: 'Easy', q: 'Static prediction…', o: ['does not learn at run time', 'uses global history', 'uses TAGE', 'uses a perceptron'], a: 0, w: '' },
      { d: 'Easy', q: 'Bimodal prediction uses…', o: ['a 2-bit counter per branch address', 'one bit total', 'global history only', 'no table'], a: 0, w: '' },
      { d: 'Medium', q: 'Alternating T/N is predicted best by…', o: ['a history-based predictor', '2-bit counter', 'always taken', 'always not-taken'], a: 0, w: '' },
      { d: 'Medium', q: '100 branches, 92 correct → accuracy', o: ['92 %', '8 %', '100 %', '50 %'], a: 0, w: '' },
      { d: 'Medium', q: 'Aliasing means…', o: ['different branches share a counter', 'a branch has no target', 'a cache miss', 'a stall'], a: 0, w: '' },
      { d: 'Medium', q: 'The BTB stores…', o: ['branch target addresses', 'register values', 'cache lines', 'opcodes'], a: 0, w: '' },
      { d: 'Hard', q: 'CPI 1, 25 % branches, 10 % miss, penalty 10 → CPI =', o: ['1.25', '1.10', '2.0', '1.025'], a: 0, w: '' },
      { d: 'Hard', q: 'TAGE improves accuracy by…', o: ['tables with several history lengths, longest match wins', 'one huge counter', 'static rules', 'ignoring history'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is a 2-bit counter better than 1-bit for loops?', o: ['hysteresis: one surprise does not flip it', 'it has more history', 'it uses the PC', 'it never mispredicts'], a: 0, w: '' }
    ]
  });
})();
