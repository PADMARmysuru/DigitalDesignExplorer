/* Level 11 · Module 10 – Advanced Verification Project */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path, esc = L.esc;
  var PRJ = [
    { n: 'ALU verification', i: '➕', spec: '8-bit ALU: ADD, SUB, AND, OR, XOR, SHL; outputs y, carry, zero.',
      stim: { o: ['Constrained-random op/a/b with corner bias (0, 255, 0x80) + directed overflow cases', 'Only a = b = 1 for every op', 'Exhaustive 2^16 × 6 vectors every night'], a: 0, w: 'Random with corner bias covers the space efficiently; exhaustive is possible for 8 bits but wasteful as a habit.' },
      sva: { o: ['assert property (@(posedge clk) (y == 0) |-> zero);', 'assert property (@(posedge clk) zero |=> carry);', 'assert property (@(posedge clk) op == ADD);'], a: 0, w: 'The zero flag must follow the result.' },
      cov: { o: ['cross op × operand class (zero, max, sign) × carry', 'line coverage only', 'one bin per opcode'], a: 0, w: 'Combinations of operation, operand corners and flags.' },
      model: { o: ['Reference model computing y and flags in SystemVerilog', 'Compare against the RTL itself', 'Look at waveforms'], a: 0, w: 'An independent model predicts the expected result.' },
      bug: { msg: 'SCOREBOARD MISMATCH seed 4417: SUB a=0x00 b=0x01 → DUT carry=0, model borrow/carry=1', o: ['Carry/borrow logic wrong for SUB when a < b', 'Testbench clock is too fast', 'The zero assertion is wrong', 'The random seed is bad'], a: 0, w: 'The model and DUT disagree only on the flag for an underflowing subtraction – a real RTL bug.' } },
    { n: 'FIFO verification', i: '📥', spec: '16 × 8 synchronous FIFO with push, pop, full, empty.',
      stim: { o: ['Random push/pop with weights that sweep fill levels + directed overflow/underflow attempts', 'Only push until full', 'Pop only'], a: 0, w: 'Weights move the FIFO through every fill level.' },
      sva: { o: ['assert property (@(posedge clk) full |-> !(push && !pop) || $stable(count));', 'assert property (@(posedge clk) empty |-> full);', 'assert property (@(posedge clk) push);'], a: 0, w: 'No count change on a write to a full FIFO (overflow protection).' },
      cov: { o: ['fill level bins × (push, pop, both) + transitions EMPTY→FULL', 'one bin: push', 'toggle coverage of data only'], a: 0, w: 'Fill levels × operations, including the corners.' },
      model: { o: ['SystemVerilog queue as reference: push_back / pop_front', 'Compare output with input in the same cycle', 'Count cycles'], a: 0, w: 'A queue is the natural FIFO reference.' },
      bug: { msg: 'ASSERTION FAILED seed 731 @ 1250 ns: simultaneous push and pop while full – count decremented, data lost', o: ['Simultaneous push/pop at full is handled as pop-only', 'The reset is too long', 'Data width mismatch in the testbench', 'Coverage model error'], a: 0, w: 'Corner case: push+pop at full should keep count and store the new word.' } },
    { n: 'UART verification', i: '📡', spec: 'UART TX/RX, configurable baud (4 rates) and parity (none/even/odd).',
      stim: { o: ['Random bytes × random configurations + injected parity/framing errors', 'Only 0x55 at one baud', 'No configuration changes'], a: 0, w: 'Every configuration plus error frames.' },
      sva: { o: ['assert property (@(posedge clk) $fell(tx) && idle |-> ##BIT_T !tx);', 'assert property (@(posedge clk) tx);', 'assert property (@(posedge clk) rx |=> tx);'], a: 0, w: 'A start bit lasts a full bit time (simplified).' },
      cov: { o: ['baud × parity × stop bits + error-frame bins', 'baud only', 'line coverage only'], a: 0, w: 'Configuration crosses plus error cases.' },
      model: { o: ['Loop-back scoreboard: TX byte must equal RX byte with correct error flags', 'Compare TX with itself', 'Visual check'], a: 0, w: 'Loop-back compares both ends.' },
      bug: { msg: 'SCOREBOARD seed 2290: odd parity, byte 0x80 – RX parity_err=1 but frame was correct', o: ['Odd-parity computation inverted in the receiver', 'Baud generator too fast', 'Testbench sends wrong bytes', 'Stop bit missing in spec'], a: 0, w: 'Fails only for odd parity: the parity check polarity is wrong.' } },
    { n: 'Register-file verification', i: '🗄️', spec: '8 × 16 register file, 1 write and 2 read ports; register 0 is read-only zero.',
      stim: { o: ['Random writes/reads incl. same-address write/read and writes to r0', 'Write r1 only', 'Read only after reset'], a: 0, w: 'Covers forwarding-style collisions and r0 protection.' },
      sva: { o: ['assert property (@(posedge clk) (raddr1 == 0) |-> (rdata1 == 0));', 'assert property (@(posedge clk) we |-> rdata1 == 0);', 'assert property (@(posedge clk) raddr1 != 0);'], a: 0, w: 'r0 always reads zero.' },
      cov: { o: ['waddr × raddr collisions × port + r0 write attempts', 'one bin per address only', 'no coverage'], a: 0, w: 'Collisions and the special register are the risky scenarios.' },
      model: { o: ['Array model updated on writes, predicting reads', 'Compare read ports with each other', 'Waveform check'], a: 0, w: 'A simple array predicts every read.' },
      bug: { msg: 'ASSERTION FAILED seed 58 @ 410 ns: raddr1 = 0, rdata1 = 0x00A5 after a write to r0', o: ['Writes to register 0 are not blocked', 'Read port 2 is broken', 'Clock skew in the testbench', 'Wrong coverage bins'], a: 0, w: 'The write-enable for r0 must be suppressed.' } },
    { n: 'Bus-interface verification', i: '🔌', spec: 'valid/ready slave interface with 1–8 beat bursts and back-pressure.',
      stim: { o: ['Random bursts, random ready delays (0–10), back-to-back requests', 'Single beats with ready always 1', 'No bursts'], a: 0, w: 'Back-pressure and bursts are where bugs hide.' },
      sva: { o: ['assert property (@(posedge clk) valid && !ready |=> valid && $stable(data));', 'assert property (@(posedge clk) ready |-> valid);', 'assert property (@(posedge clk) valid |-> ready);'], a: 0, w: 'The core handshake rule.' },
      cov: { o: ['burst length × wait cycles × back-to-back', 'burst length only', 'line coverage only'], a: 0, w: 'Combinations of length and stalls.' },
      model: { o: ['Scoreboard collecting accepted beats and comparing with the expected memory contents', 'Count valid pulses', 'Visual check'], a: 0, w: 'End-to-end data check.' },
      bug: { msg: 'ASSERTION FAILED seed 1312: valid && !ready, data changed in beat 3 of an 8-beat burst after a 7-cycle stall', o: ['Burst counter advances while stalled', 'ready generator broken in testbench', 'Wrong clock period', 'Coverage hole'], a: 0, w: 'Long stalls in long bursts expose the counter bug.' } }
  ];
  var STEPS = ['Stimulus', 'Assertion', 'Coverage', 'Scoreboard / model', 'Regression', 'Debug', 'Sign-off'];

  function projLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Verification project · choose a DUT and take it to sign-off</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var st;
    var pick = L.h('div', 'l7-choice'); body.appendChild(pick);
    var bar = L.h('div', 'l7-row'); body.appendChild(bar);
    var view = L.h('div', ''); body.appendChild(view);
    var nav = L.h('div', 'l7-row'); body.appendChild(nav);
    function choose() {
      pick.innerHTML = '';
      PRJ.forEach(function (p) { var b = L.h('button', st && st.p === p ? 'is-pick' : '', p.i + ' ' + p.n); b.type = 'button'; b.addEventListener('click', function () { st = { p: p, step: 0, max: 0, ok: {}, runs: 0, fixed: false, ord: {} }; choose(); draw(); }); pick.appendChild(b); });
    }
    function q(key, item) {
      var ch = L.h('div', 'l7-choice'); ch.style.gridTemplateColumns = '1fr'; view.appendChild(ch);
      var fb = L.h('div', 'l7-fb'); view.appendChild(fb);
      if (!st.ord[key]) st.ord[key] = item.o.map(function (x, i) { return i; }).sort(function () { return Math.random() - 0.5; });
      st.ord[key].forEach(function (k) {
        var mono = /assert|cross|×|\(/.test(item.o[k]) && key !== 'bug';
        var b = L.h('button', (st.ok[key] && k === item.a ? 'is-right ' : '') + (mono ? 'l7-mono' : ''), esc(item.o[k])); b.type = 'button'; if (mono) b.style.fontSize = '.8rem';
        b.addEventListener('click', function () { L.$$('button', ch).forEach(function (x) { x.classList.remove('is-right', 'is-wrong'); }); b.classList.add(k === item.a ? 'is-right' : 'is-wrong'); L.fb(fb, k === item.a ? 'ok' : 'bad', (k === item.a ? '✓ ' : '✗ ') + (k === item.a ? item.w : 'Not the best choice – think about what could go wrong in this DUT.')); if (k === item.a) { st.ok[key] = 1; if (key === 'bug') draw(); else drawNav(); } });
        ch.appendChild(b);
      });
      if (st.ok[key]) L.fb(fb, 'ok', '✓ ' + item.w);
    }
    function can() { var s = st.step; return s === 0 ? st.ok.stim : s === 1 ? st.ok.sva : s === 2 ? st.ok.cov : s === 3 ? st.ok.model : s === 4 ? st.runs > 0 : s === 5 ? st.fixed : false; }
    function go(i) { st.step = i; st.max = Math.max(st.max, i); draw(); }
    function drawNav() { nav.innerHTML = ''; if (!st) return; if (st.step > 0) nav.appendChild(L.btn('← Back', 'ghost', function () { go(st.step - 1); })); if (st.step < 6) { var b = L.btn('Next: ' + STEPS[st.step + 1] + ' →', 'pri', function () { go(st.step + 1); }); b.disabled = !can(); nav.appendChild(b); } }
    function draw() {
      bar.innerHTML = ''; view.innerHTML = '';
      if (!st) { drawNav(); return; }
      STEPS.forEach(function (s, i) { var b = L.btn((i < st.max ? '✓ ' : '') + (i + 1) + '. ' + s, i === st.step ? 'is-on' : '', function () { if (i <= st.max) go(i); }); b.style.fontSize = '.78rem'; if (i > st.max) b.disabled = true; bar.appendChild(b); });
      var p = st.p, s = st.step;
      view.appendChild(L.h('div', 'l7-readout', '<span class="k">' + p.i + ' ' + esc(p.n) + '</span> – ' + esc(p.spec)));
      var h = function (x, c) { var e = L.h('div', c || '', x); view.appendChild(e); return e; };
      if (s === 0) { h('<p><b>Choose the stimulus strategy.</b></p>'); q('stim', p.stim); }
      if (s === 1) { h('<p><b>Choose the key assertion.</b></p>'); q('sva', p.sva); }
      if (s === 2) { h('<p><b>Choose the functional coverage model.</b></p>'); q('cov', p.cov); }
      if (s === 3) { h('<p><b>Choose the checking strategy.</b></p>'); q('model', p.model); }
      if (s === 4) {
        view.appendChild(L.btn(st.fixed ? '▶ Re-run regression' : '▶ Run nightly regression (200 tests × random seeds)', 'pri', function () { st.runs++; draw(); }));
        if (st.runs) {
          var pass = st.fixed ? 200 : 199, cov = st.fixed ? 100 : 96;
          h('<div class="l7-table-wrap"><table class="l7-cmp"><tr><th>Regression</th><th>Result</th></tr><tr><td>Tests</td><td>' + pass + ' / 200 pass</td></tr><tr><td>Functional coverage</td><td>' + cov + ' %</td></tr><tr><td>Assertions</td><td>' + (st.fixed ? 'all pass, all covered' : '1 failure') + '</td></tr></table></div>');
          if (!st.fixed) h('<pre class="l7-code sm">' + esc(p.bug.msg) + '</pre>');
          h('<div class="l7-verdict ' + (st.fixed ? 'ok' : 'warn') + '">' + (st.fixed ? '✅ Clean regression after the fix' : '🐞 A failure – the environment found a bug') + '<small>' + (st.fixed ? 'Continue to sign-off.' : 'Continue to Debug to find the root cause.') + '</small></div>');
        }
      }
      if (s === 5) {
        h('<pre class="l7-code sm">' + esc(p.bug.msg) + '</pre><p><b>What is the root cause?</b></p>'); q('bug', p.bug);
        if (st.ok.bug) { view.appendChild(L.btn(st.fixed ? '✓ Fix applied and regression test added' : '🔧 Apply the RTL fix + add the failing seed to the regression', st.fixed ? 'is-on' : 'pri', function () { st.fixed = true; st.runs = 0; draw(); })); }
        if (st.fixed) h('<p class="l7-hint">Now go back to Regression and re-run it.</p>');
      }
      if (s === 6) {
        var clean = st.fixed && st.runs > 0;
        h('<p><b>Sign-off review</b></p>');
        h('<div class="l7-table-wrap"><table class="l7-cmp"><tr><th>Criterion</th><th>Status</th></tr><tr><td>Stimulus · assertions · coverage · scoreboard</td><td class="better">in place</td></tr><tr><td>Bugs found / fixed</td><td>1 / ' + (st.fixed ? 1 : 0) + '</td></tr><tr><td>Regression after fix</td><td class="' + (clean ? 'better' : 'worse') + '">' + (clean ? '200 / 200' : 'not re-run') + '</td></tr><tr><td>Functional coverage</td><td class="' + (clean ? 'better' : 'worse') + '">' + (clean ? '100 %' : '96 %') + '</td></tr></table></div>');
        h('<div class="l7-verdict ' + (clean ? 'ok' : 'bad') + '">' + (clean ? '🏁 Verification signed off: ' + esc(p.n) : '❌ Not ready: re-run the regression after the fix') + '<small>' + (clean ? 'Plan → stimulus → assertions → coverage → scoreboard → regression → debug → re-run → closure. That is the professional verification loop.' : 'Go back to step 5.') + '</small></div>');
        if (clean) api.done();
      }
      drawNav();
    }
    choose(); draw();
  }

  function loopFrame(k) {
    var o = '', items = ['Plan', 'Stimulus', 'Checks', 'Coverage', 'Regression', 'Debug', 'Sign-off'];
    items.forEach(function (s, i) { var a = -Math.PI / 2 + i * 2 * Math.PI / 7, x = 300 + 150 * Math.cos(a), y = 105 + 75 * Math.sin(a); o += R(x - 48, y - 16, 96, 32, i <= k * 2 ? 'box-on' : 'box', 8) + T(x, y + 5, s, 't-ink t-b t-sm'); });
    o += T(300, 110, ['plan the work', 'build checks + stimulus', 'run, debug, repeat', 'until the exit criteria hold'][k], 't-vio t-b t-sm');
    return S(600, 210, o, 'Verification loop');
  }

  L.module({
    n: 10,
    lead: 'Bring the whole level together. Choose a design and verify it the professional way: stimulus strategy, assertions, functional coverage, a reference model, regressions, debugging a real failure and a sign-off decision based on evidence.',
    tags: ['project', 'stimulus', 'assertions', 'functional coverage', 'scoreboard', 'reference model', 'regression', 'debug', 'sign-off'],
    sections: [
      {
        id: 'st-loop', type: 'steps', title: 'Animation: the verification loop', nav: 'The loop',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Start with the plan.', 'Build stimulus and checks (assertions + scoreboard).', 'Run regressions, measure coverage, debug failures.', 'Repeat until every exit criterion is met – then sign off.'][k], svg: loopFrame(k) }; })
      },
      { id: 'w-proj', type: 'widget', title: 'Advanced verification project', nav: 'Project', intro: 'Choose one of five DUTs and complete all seven steps, including fixing the bug your environment finds.', build: projLab },
      {
        id: 'c-report', type: 'concept', title: 'What a verification report contains', nav: 'Report',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Evidence</h4><ul><li>plan features → tests / assertions / coverage items</li><li>coverage results with exclusions explained</li><li>regression history</li></ul></div><div class="l7-box"><h4>Status</h4><ul><li>bugs found, fixed, open (by severity)</li><li>known limitations and waived items</li><li>sign-off recommendation</li></ul></div></div>'
      },
      {
        id: 'rv-10', type: 'reveal', title: 'Click to reveal: project lessons', nav: 'Lessons',
        items: [
          { q: 'Why did the bug appear only with one seed?', a: 'It needed a rare combination (a corner case) – random stimulus with corner bias found it; directed tests might never have.' },
          { q: 'Why add the failing seed to the regression?', a: 'So the bug can never silently return.' },
          { q: 'Why re-run the whole regression after a fix?', a: 'A fix can break something else.' },
          { q: 'Is 1 bug in 200 tests a bad result?', a: 'No – finding bugs is the job. Bugs found before tape-out are cheap.' }
        ]
      },
      {
        id: 'dd-10', type: 'drag', title: 'Drag & drop: order the project steps', nav: 'Order',
        bins: ['Build', 'Run', 'Close'],
        items: [['Choose stimulus strategy', 0], ['Write assertions', 0], ['Define coverage model', 0], ['Run regression', 1], ['Debug failure', 1], ['Re-run after fix', 2], ['Review coverage and bugs for sign-off', 2]]
      },
      {
        id: 'mcq10', type: 'mcq', title: 'Integrated MCQs', nav: 'MCQ',
        items: [
          { q: 'A scoreboard mismatch on one seed should be…', o: ['reproduced with that seed and debugged', 'ignored', 'deleted', 'waived'], a: 0, w: '' },
          { q: 'Sign-off needs…', o: ['coverage goals met, clean regressions, no open critical bugs', 'one passing test', 'synthesis', 'waveforms'], a: 0, w: '' },
          { q: 'A FIFO reference model is naturally…', o: ['a queue', 'a counter', 'an assertion', 'a covergroup'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen10', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'After the fix, the regression is green but coverage dropped from 96 % to 90 %.', q: 'What happened, and what do you do?', o: [{ t: 'The fix or a constraint change stopped some scenarios – analyse the new holes before sign-off', ok: true, w: 'Coverage must be re-checked after every change.' }, { t: 'Sign off – tests pass', ok: false, w: 'Coverage fell.' }, { t: 'Ignore coverage', ok: false, w: 'No.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The verification project starts from…', o: ['the specification', 'the layout', 'the test patterns', 'the bug list'], a: 0, w: '' },
      { d: 'Easy', q: 'A failing seed is used to…', o: ['reproduce the failure', 'increase coverage', 'synthesise the DUT', 'skip tests'], a: 0, w: '' },
      { d: 'Easy', q: 'After a fix you must…', o: ['re-run the regression', 'stop testing', 'delete tests', 'reduce coverage'], a: 0, w: '' },
      { d: 'Medium', q: 'For an ALU, the checking strategy of choice is…', o: ['a reference model', 'waveform viewing', 'line coverage', 'toggle coverage'], a: 0, w: '' },
      { d: 'Medium', q: 'For a UART, a natural end-to-end check is…', o: ['loop-back scoreboard', 'clock assertion only', 'ATPG', 'LVS'], a: 0, w: '' },
      { d: 'Medium', q: 'r0 always reads zero is best checked by…', o: ['an assertion', 'toggle coverage', 'synthesis', 'a covergroup only'], a: 0, w: '' },
      { d: 'Medium', q: 'Back-pressure bugs in a bus are found with…', o: ['random ready delays', 'single beats only', 'line coverage', 'fewer tests'], a: 0, w: '' },
      { d: 'Hard', q: 'Push+pop at full is an example of a…', o: ['corner case', 'syntax error', 'timing violation', 'DFT fault'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is a reference model independent of the RTL?', o: ['so the same mistake is not repeated in both', 'it is faster', 'it is synthesizable', 'it is required by UVM'], a: 0, w: '' },
      { d: 'Hard', q: 'A verification report should include…', o: ['coverage, regression history and open bugs', 'only pass/fail', 'the GDSII', 'the netlist'], a: 0, w: '' }
    ]
  });
})();
