/* Level 11 · Module 6 – Code Coverage */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var CODE = [
    'always_comb begin',
    '  y = \'0;  err = 1\'b0;',
    '  case (op)',
    '    ADD: y = a + b;',
    '    SUB: y = a - b;',
    '    DIV: if (b == 0) err = 1\'b1;',
    '         else        y = a / b;',
    '    default:          err = 1\'b1;',
    '  endcase',
    '  if (en && mode) y = ~y;',
    'end'
  ];
  var TESTS = [
    { n: 'T1: ADD, en=0, mode=0', op: 'ADD', b: 4, en: 0, mode: 0 },
    { n: 'T2: SUB, en=1, mode=1', op: 'SUB', b: 4, en: 1, mode: 1 },
    { n: 'T3: DIV b=2, en=1, mode=0', op: 'DIV', b: 2, en: 1, mode: 0 },
    { n: 'T4: DIV b=0', op: 'DIV', b: 0, en: 0, mode: 0 },
    { n: 'T5: illegal opcode', op: 'BAD', b: 1, en: 0, mode: 0 },
    { n: 'T6: ADD, en=0, mode=1', op: 'ADD', b: 1, en: 0, mode: 1 }
  ];
  function analyse(sel) {
    var st = {}, br = {}, ex = {};
    sel.forEach(function (t) {
      st[1] = st[2] = st[9] = 1;
      if (t.op === 'ADD') { st[3] = 1; br.ADD = 1; } else if (t.op === 'SUB') { st[4] = 1; br.SUB = 1; } else if (t.op === 'DIV') { br.DIV = 1; if (t.b === 0) { st[5] = 1; br.b0T = 1; } else { st[6] = 1; br.b0F = 1; } } else { st[7] = 1; br.DEF = 1; }
      if (t.en && t.mode) { br.ifT = 1; st['9t'] = 1; ex.both = 1; } else { br.ifF = 1; if (!t.en && t.mode) ex.en = 1; if (t.en && !t.mode) ex.mode = 1; }
    });
    return { st: st, br: br, ex: ex };
  }
  var STMTS = [1, 2, 3, 4, 5, 6, 7, 9, '9t'], BRS = [['ADD', 'case ADD'], ['SUB', 'case SUB'], ['DIV', 'case DIV'], ['DEF', 'case default'], ['b0T', 'b == 0 true'], ['b0F', 'b == 0 false'], ['ifT', 'en && mode true'], ['ifF', 'en && mode false']], EXS = [['both', 'en=1, mode=1 → true'], ['en', 'en=0 alone makes it false'], ['mode', 'mode=0 alone makes it false']];

  /* ---------- Widget: coverage explorer ---------- */
  function covLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Code coverage explorer · choose tests, find the uncovered code</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var on = { 0: 1, 1: 1 }, done = false;
    var row = L.h('div', 'l7-choice'); body.appendChild(row);
    var codeBox = L.h('div', ''); body.appendChild(codeBox);
    var tbl = L.h('div', 'l7-grid2'); body.appendChild(tbl);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      row.innerHTML = '';
      TESTS.forEach(function (t, i) { var b = L.h('button', on[i] ? 'is-pick' : '', (on[i] ? '☑ ' : '☐ ') + t.n); b.type = 'button'; b.addEventListener('click', function () { if (on[i]) delete on[i]; else on[i] = 1; draw(); }); row.appendChild(b); });
      var sel = Object.keys(on).map(function (k) { return TESTS[k]; }), a = analyse(sel);
      var lines = CODE.map(function (ln, i) {
        var cov = i === 0 || i === 2 || i === 8 || i === 10 ? null : i === 9 ? (a.st[9] && a.st['9t'] ? 1 : a.st[9] ? 0.5 : 0) : a.st[i] ? 1 : 0;
        var bg = cov === null ? '' : cov === 1 ? 'background:rgba(52,199,89,.25)' : cov === 0.5 ? 'background:rgba(255,149,0,.3)' : 'background:rgba(255,59,48,.3)';
        return '<span style="display:block;' + bg + '">' + String(i + 1).padStart(2, ' ') + '  ' + L.esc(ln) + '</span>';
      }).join('');
      codeBox.innerHTML = '<pre class="l7-code">' + lines + '</pre><p class="l7-hint">green = executed · red = never executed · orange = line executed but its "then" part never taken</p>';
      var sc = STMTS.filter(function (k) { return a.st[k]; }).length, bc = BRS.filter(function (b) { return a.br[b[0]]; }).length, ec = EXS.filter(function (e) { return a.ex[e[0]]; }).length;
      var pct = function (x, n) { return Math.round(100 * x / n); };
      tbl.innerHTML = '<div class="l7-box"><h4>Statement ' + pct(sc, STMTS.length) + ' % · Branch ' + pct(bc, BRS.length) + ' %</h4><p>' + BRS.map(function (b) { return (a.br[b[0]] ? '✅ ' : '❌ ') + b[1]; }).join('<br>') + '</p></div>' +
        '<div class="l7-box"><h4>Expression (en && mode) ' + pct(ec, 3) + ' %</h4><p>' + EXS.map(function (e) { return (a.ex[e[0]] ? '✅ ' : '❌ ') + e[1]; }).join('<br>') + '</p><p class="l7-hint">Each input must be shown to control the result on its own.</p></div>';
      var full = sc === STMTS.length && bc === BRS.length && ec === 3;
      verdict.className = 'l7-verdict ' + (full ? 'ok' : 'warn');
      verdict.innerHTML = full ? '✅ 100 % statement, branch and expression coverage with ' + sel.length + ' tests<small>' + (sel.length <= 5 ? 'An efficient test set.' : 'Can you do it with fewer tests? (5 is the minimum.)') + ' Remember: full code coverage still does not prove the results were checked – that needs the scoreboard and assertions.</small>' : '🔍 Uncovered code remains<small>Add tests that execute the red lines and the missing branches / expression conditions.</small>';
      if (full && !done) { done = true; api.done(); }
    }
    draw();
  }

  function kindFrame(k) {
    var o = '', kinds = [['Statement', 'was each line executed?'], ['Branch', 'was each if/case outcome taken?'], ['Expression / condition', 'did each input independently decide the result?'], ['Toggle', 'did each bit go 0→1 and 1→0?'], ['FSM', 'was each state and transition visited?']];
    kinds.forEach(function (x, i) { o += R(20, 14 + i * 34, 560, 28, i === k ? 'box-on' : 'box', 8) + T(30, 33 + i * 34, x[0] + ' – ' + x[1], i === k ? 't-ink t-b t-sm' : 't-dim t-sm', 'start'); });
    return S(600, 190, o, 'Code coverage kinds');
  }

  L.module({
    n: 6,
    lead: 'Code coverage is measured automatically by the simulator from the RTL itself: which statements, branches, conditions, bits and FSM transitions were exercised. It is the cheapest way to find dead or untested code – and it is easy to over-trust.',
    tags: ['statement', 'branch', 'expression', 'toggle', 'FSM coverage', 'coverage reports', 'limitations'],
    sections: [
      {
        id: 'st-kinds', type: 'steps', title: 'Animation: the kinds of code coverage', nav: 'Kinds',
        frames: [0, 1, 2, 3, 4].map(function (k) { return { t: ['<b>Statement (line) coverage</b>: the weakest – each line ran at least once.', '<b>Branch coverage</b>: every possible outcome of every if and case.', '<b>Expression / condition coverage</b>: each sub-condition shown to change the outcome.', '<b>Toggle coverage</b>: every signal bit toggled both ways – finds stuck or unused bits.', '<b>FSM coverage</b>: every state and every legal transition visited.'][k], svg: kindFrame(k) }; })
      },
      { id: 'w-cc', type: 'widget', title: 'Coverage explorer', nav: 'Coverage explorer', intro: 'Choose tests until statement, branch and expression coverage all reach 100 %.', build: covLab },
      {
        id: 'c-vs', type: 'concept', title: 'Code coverage vs functional coverage', nav: 'Code vs functional',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th></th><th>Code coverage</th><th>Functional coverage</th></tr><tr><td>Source</td><td>automatic, from the RTL</td><td>written by hand, from the plan</td></tr><tr><td>Finds</td><td>dead code, untested branches</td><td>missing scenarios and combinations</td></tr><tr><td>Cannot find</td><td>missing features (code that was never written)</td><td>untested code the plan forgot</td></tr></table></div><p>Both are needed for sign-off. Code coverage holes are reviewed: either a test is added, or the code is shown to be unreachable and excluded (waived).</p>'
      },
      {
        id: 'c-lim', type: 'concept', title: 'Coverage reports and limitations', nav: 'Limitations',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>Coverage ≠ correctness</h4><p>A line can execute with a wrong result that nobody checked. Coverage measures stimulus, not checking.</p></div><div class="l7-box vio"><h4>Missing code</h4><p>If a feature was never implemented, there is no code to be uncovered – only functional coverage and the plan notice it.</p></div></div>'
      },
      {
        id: 'rv-6', type: 'reveal', title: 'Click to reveal: code coverage insights', nav: 'Reveal',
        items: [
          { q: 'Why can a design have 100 % line coverage and still have bugs?', a: 'Every line ran, but not every combination, value or sequence – and results may not have been checked.' },
          { q: 'What does toggle coverage catch?', a: 'Bits that never change: unconnected or stuck signals, unused bus bits.' },
          { q: 'What is a coverage exclusion?', a: 'Code shown to be unreachable (e.g. defensive default branch) is excluded after review, with a documented reason.' },
          { q: 'Is code coverage free?', a: 'Collecting it slows simulation, so regressions often enable it only in some runs.' }
        ]
      },
      {
        id: 'dd-6', type: 'drag', title: 'Drag & drop: which coverage reveals it?', nav: 'Drag & drop',
        bins: ['Branch', 'Toggle', 'FSM', 'Expression'],
        items: [['the else of "if (b == 0)" never ran', 0], ['bit 31 of a bus never changed', 1], ['state ERROR was never entered', 2], ['mode never decided "en && mode" on its own', 3]]
      },
      {
        id: 'mcq6', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Code coverage is collected…', o: ['automatically by the simulator from the RTL', 'by hand from the plan', 'by synthesis', 'by ATPG'], a: 0, w: '' },
          { q: 'Branch coverage requires…', o: ['every outcome of every decision', 'every line only', 'every bit toggle', 'every assertion'], a: 0, w: '' },
          { q: 'Which can find a missing feature?', o: ['functional coverage against the plan', 'line coverage', 'toggle coverage', 'branch coverage'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen6', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A default branch in a case statement is never covered because all legal opcodes are listed.', q: 'What is the right action?', o: [{ t: 'Either add an illegal-opcode test (if reachable) or review and exclude it as unreachable', ok: true, w: 'Holes are closed by tests or justified exclusions.' }, { t: 'Delete the default branch', ok: false, w: 'It protects against illegal values.' }, { t: 'Ignore all coverage', ok: false, w: 'No.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Statement coverage measures…', o: ['which lines executed', 'which scenarios occurred', 'timing', 'power'], a: 0, w: '' },
      { d: 'Easy', q: 'Toggle coverage checks…', o: ['each bit changes 0→1 and 1→0', 'each line runs', 'each state is visited', 'each assertion passes'], a: 0, w: '' },
      { d: 'Easy', q: 'FSM coverage includes…', o: ['states and transitions', 'coverpoints only', 'clock skew', 'DRC'], a: 0, w: '' },
      { d: 'Medium', q: 'An if-else needs how many branch outcomes covered?', o: ['1', '2', '3', '4'], a: 1, w: '' },
      { d: 'Medium', q: 'A 4-item case with default has how many branches?', o: ['4', '5', '1', '8'], a: 1, w: '' },
      { d: 'Medium', q: 'Expression coverage of (a && b) needs tests where…', o: ['each input alone decides the result', 'both are always 1', 'both are always 0', 'only a changes'], a: 0, w: '' },
      { d: 'Medium', q: '100 % line coverage proves…', o: ['every line ran – not that results were correct', 'no bugs', 'all scenarios', 'timing'], a: 0, w: '' },
      { d: 'Hard', q: 'Code coverage cannot detect…', o: ['features that were never coded', 'unexecuted lines', 'untaken branches', 'untoggled bits'], a: 0, w: '' },
      { d: 'Hard', q: 'A justified exclusion is used for…', o: ['provably unreachable code', 'any hard-to-reach code', 'failing tests', 'assertions'], a: 0, w: '' },
      { d: 'Hard', q: 'Sign-off typically requires…', o: ['both code and functional coverage goals', 'only line coverage', 'only waveforms', 'only synthesis'], a: 0, w: '' }
    ]
  });
})();
