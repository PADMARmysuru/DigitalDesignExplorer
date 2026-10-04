/* Level 13 · Module 4 – Speculative Execution */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var PATHS = {
    nt: [['add r2, r2, #1', 'r2', function (s) { return s.r2 + 1; }], ['mul r3, r2, #4', 'r3', function (s, v) { return v.r2 * 4; }], ['st  r3, [buf]', 'mem', function (s, v) { return v.r3; }]],
    t: [['sub r2, r2, #1', 'r2', function (s) { return s.r2 - 1; }], ['add r3, r2, r2', 'r3', function (s, v) { return v.r2 * 2; }], ['st  r3, [buf]', 'mem', function (s, v) { return v.r3; }]]
  };

  /* ---------- Widget: speculation simulator ---------- */
  function specLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Speculation simulator · <code>ld r1,[x]</code> → <code>beq r1, r0, ELSE</code> → predicted path</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var arch, rob, phase, pred, seen = {}, done = false, lost = 0;
    function reset() { arch = { r1: 0, r2: 10, r3: 0, mem: 0 }; rob = []; phase = 0; pred = null; draw(); }
    var ctrl = L.h('div', ''); body.appendChild(ctrl);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function speculate() {
      var v = { r2: arch.r2, r3: arch.r3 }, path = PATHS[pred];
      rob = [{ t: 'ld  r1, [x]', d: 'r1', val: '…', st: 'waiting for memory' }, { t: 'beq r1, r0, ELSE', d: '–', val: '?', st: 'predicted ' + (pred === 't' ? 'TAKEN' : 'NOT TAKEN') }];
      path.forEach(function (p) { var val = p[2](arch, v); if (p[1] !== 'mem') v[p[1]] = val; rob.push({ t: p[0], d: p[1], val: val, st: 'executed speculatively', spec: true }); });
      phase = 2; draw();
      L.fb(fb, 'info', 'The load is slow, so the processor did not wait: it predicted the branch and executed 3 instructions speculatively. Their results live only in the reorder buffer – the architectural registers and memory are unchanged.');
    }
    function resolve(actualTaken) {
      var a = actualTaken ? 't' : 'nt', r1 = actualTaken ? 0 : 7;
      rob[0].val = r1; rob[0].st = 'done';
      if (a === pred) {
        rob[1].st = 'correct ✓';
        arch.r1 = r1; rob.slice(2).forEach(function (e) { arch[e.d] = e.val; e.st = 'committed'; });
        seen.ok = 1; phase = 3; draw();
        L.fb(fb, 'ok', '✓ Prediction correct: all speculative results commit in order. No time was lost – the work was done while the load was waiting.');
      } else {
        rob[1].st = 'MISPREDICTED ✗';
        rob.slice(2).forEach(function (e) { e.st = 'FLUSHED'; e.flush = true; });
        arch.r1 = r1; lost += 12;
        var v = { r2: arch.r2, r3: arch.r3 };
        PATHS[a].forEach(function (p) { var val = p[2](arch, v); if (p[1] !== 'mem') v[p[1]] = val; rob.push({ t: p[0], d: p[1], val: val, st: 'correct path, committed', fix: true }); });
        rob.filter(function (e) { return e.fix; }).forEach(function (e) { arch[e.d] = e.val; });
        seen.miss = 1; phase = 3; draw();
        L.fb(fb, 'bad', '✗ Misprediction: the speculative instructions are flushed (their results never reach the registers or memory – note the store was held back), the PC is redirected to the correct path and those instructions execute instead. Cost: about 12 cycles of wasted work.');
      }
    }
    function draw() {
      ctrl.innerHTML = '';
      var row = L.h('div', 'l7-row'); ctrl.appendChild(row);
      if (phase === 0) { row.appendChild(L.h('span', 'l7-lab-label', '1 · Predict the branch:')); row.appendChild(L.btn('Not taken', 'pri', function () { pred = 'nt'; phase = 1; speculate(); })); row.appendChild(L.btn('Taken', 'pri', function () { pred = 't'; phase = 1; speculate(); })); }
      if (phase === 2) { row.appendChild(L.h('span', 'l7-lab-label', '2 · The load returns – actual outcome:')); row.appendChild(L.btn('r1 ≠ 0 → not taken', '', function () { resolve(false); })); row.appendChild(L.btn('r1 = 0 → taken', '', function () { resolve(true); })); }
      if (phase === 3) row.appendChild(L.btn('↺ Run again', 'ghost', reset));
      var o = T(10, 18, 'Architectural state (visible to software)', 't-ink t-b t-sm', 'start');
      ['r1', 'r2', 'r3', 'mem'].forEach(function (k, i) { o += R(10 + i * 70, 26, 62, 40, 'box-ok', 8) + T(41 + i * 70, 42, k === 'mem' ? '[buf]' : k, 't-dim t-sm') + T(41 + i * 70, 60, arch[k], 't-ink t-b'); });
      o += T(310, 18, 'Reorder buffer (speculative state)', 't-ink t-b t-sm', 'start');
      rob.forEach(function (e, i) {
        var y = 26 + i * 30, cls = e.flush ? 'box-bad' : e.fix ? 'box-ok' : e.spec ? 'box-cu' : 'box';
        o += R(310, y, 280, 26, cls, 6) + T(318, y + 17, e.t, 't-ink t-sm', 'start').replace('class="', 'font-family="JetBrains Mono,monospace" class="') + T(582, y + 17, (e.flush ? '' : String(e.val) + ' · ') + e.st, e.flush ? 't-bad t-b t-sm' : 't-dim t-sm', 'end');
      });
      pic.innerHTML = S(600, Math.max(90, 40 + rob.length * 30), o, 'Speculative execution');
      verdict.className = 'l7-verdict ' + (seen.ok && seen.miss ? 'ok' : 'warn');
      verdict.innerHTML = 'Correct prediction ' + (seen.ok ? '✅' : '○') + ' · misprediction + recovery ' + (seen.miss ? '✅' : '○') + (lost ? ' · cycles wasted so far: ' + lost : '') + '<small>Experience both outcomes: predict, then choose the actual result of the load.</small>';
      if (seen.ok && seen.miss && !done) { done = true; api.done(); }
    }
    reset();
  }

  function sFrame(k) {
    var o = '', boxes = ['Predict', 'Execute ahead', 'Resolve', k === 3 ? 'Flush + redirect' : 'Commit'];
    boxes.forEach(function (b, i) { o += R(20 + i * 145, 50, 125, 46, i <= k ? (i === 3 && k === 3 ? 'box-bad' : 'box-on') : 'box', 10) + T(82 + i * 145, 78, b, 't-ink t-b t-sm'); if (i < 3) o += P('M' + (145 + i * 145) + ' 73H' + (165 + i * 145), 'w'); });
    o += T(300, 130, ['The predictor guesses the branch direction', 'Instructions on the predicted path execute; results stay speculative', 'The branch condition becomes known', 'If wrong: discard all younger work and fetch the correct path'][k], 't-vio t-b t-sm');
    return S(600, 146, o, 'Speculation');
  }

  L.module({
    n: 4,
    lead: 'Waiting for every branch would waste dozens of cycles. Instead, processors execute speculatively along the predicted path and keep the results tentative until they know the guess was right. Learn how architectural and speculative state are kept apart and how a misprediction is undone.',
    tags: ['speculation', 'branch prediction', 'speculative execution', 'misprediction', 'recovery', 'flushing', 'architectural state', 'speculative state'],
    sections: [
      {
        id: 'st-spec', type: 'steps', title: 'Animation: the speculation cycle', nav: 'Speculation cycle',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Predict the branch (Module 3).', 'Keep fetching and executing on the predicted path.', 'Resolve the branch when its operands are ready.', 'Correct → commit. Wrong → flush everything younger than the branch and restart on the right path.'][k], svg: sFrame(k) }; })
      },
      {
        id: 'c-state', type: 'concept', title: 'Architectural vs speculative state', nav: 'State',
        html: '<div class="l7-grid2"><div class="l7-box ok"><h4>Architectural state</h4><p>Registers, memory and PC as the program sees them. Updated only at <b>commit</b>, in program order.</p></div><div class="l7-box cu"><h4>Speculative state</h4><p>Results of instructions that may still be cancelled – held in the reorder buffer, rename registers and store buffer.</p></div></div>' +
          '<p style="margin-top:12px"><b>Recovery</b> discards speculative entries, restores the rename map and redirects fetch. Stores are never written to memory while speculative.</p>'
      },
      { id: 'w-spec', type: 'widget', title: 'Speculation simulator', nav: 'Speculation lab', intro: 'Predict, execute speculatively, then reveal the real outcome. Experience a correct prediction and a misprediction.', build: specLab },
      {
        id: 'rv-4', type: 'reveal', title: 'Click to reveal: speculation insights', nav: 'Reveal',
        items: [
          { q: 'Why are speculative stores held back?', a: 'Memory cannot be "un-written"; stores wait in a store buffer until they commit.' },
          { q: 'What is the misprediction penalty in a deep out-of-order core?', a: 'Often 15–20+ cycles of wasted work – which is why predictor accuracy matters so much.' },
          { q: 'Can speculation leak information?', a: 'Yes – Spectre-type attacks use microarchitectural side effects (e.g. cache state) of squashed instructions; modern CPUs add mitigations.' },
          { q: 'Is speculation only for branches?', a: 'No – processors also speculate on memory dependences and load values.' }
        ]
      },
      {
        id: 'dd-4', type: 'drag', title: 'Drag & drop: speculative or architectural?', nav: 'Drag & drop',
        bins: ['Speculative state', 'Architectural state'],
        items: [['result waiting in the reorder buffer', 0], ['store in the store buffer before commit', 0], ['register value after commit', 1], ['memory contents seen by other cores', 1], ['rename register of an unresolved path', 0]]
      },
      {
        id: 'mcq4', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Speculative results become architectural at…', o: ['commit', 'fetch', 'decode', 'issue'], a: 0, w: '' },
          { q: 'After a misprediction, younger instructions are…', o: ['flushed', 'committed', 'forwarded', 'cached'], a: 0, w: '' },
          { q: 'Speculative stores are…', o: ['held until commit', 'written immediately', 'discarded always', 'sent to the BTB'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen4', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A core speculates 100 instructions deep; its predictor is 90 % accurate on a branch-heavy workload.', q: 'What limits the benefit of deeper speculation?', o: [{ t: 'The probability that the whole speculative window is on the correct path falls quickly', ok: true, w: 'Each unresolved branch multiplies the risk.' }, { t: 'Nothing – deeper is always better', ok: false, w: 'Wasted work and power grow.' }, { t: 'The register file size only', ok: false, w: 'Not the main limit.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Speculative execution means…', o: ['executing before knowing the instructions are needed', 'executing only after branches resolve', 'skipping instructions', 'executing twice'], a: 0, w: '' },
      { d: 'Easy', q: 'On a correct prediction, speculative work is…', o: ['committed', 'flushed', 'repeated', 'ignored'], a: 0, w: '' },
      { d: 'Easy', q: 'Architectural state is…', o: ['what software sees', 'the ROB contents', 'the BTB', 'the predictor table'], a: 0, w: '' },
      { d: 'Medium', q: 'Which structure holds speculative results in order?', o: ['reorder buffer', 'instruction cache', 'register file only', 'BTB'], a: 0, w: '' },
      { d: 'Medium', q: 'Recovery restores…', o: ['the rename map and PC', 'the cache contents', 'the clock', 'the predictor'], a: 0, w: '' },
      { d: 'Medium', q: 'Speculation mainly hides…', o: ['branch and memory latency', 'area', 'leakage', 'routing'], a: 0, w: '' },
      { d: 'Medium', q: 'A misprediction costs…', o: ['the wasted cycles of flushed work', 'nothing', 'a cache flush always', 'a reset'], a: 0, w: '' },
      { d: 'Hard', q: '20 % branches, 5 % mispredicted, 18-cycle penalty: added CPI =', o: ['0.18', '0.9', '0.05', '1.8'], a: 0, w: '0.2 × 0.05 × 18.' },
      { d: 'Hard', q: 'Why can squashed instructions still matter for security?', o: ['they may leave traces in caches (side channels)', 'they commit anyway', 'they change registers', 'they cannot'], a: 0, w: '' },
      { d: 'Hard', q: 'Stores update memory…', o: ['only at commit', 'when executed', 'at fetch', 'at decode'], a: 0, w: '' }
    ]
  });
})();
