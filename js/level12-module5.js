/* Level 12 · Module 5 – Advanced Memory Test */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var N = 8;
  var ALG = {
    mats: { n: 'MATS+  {⇕(w0); ⇑(r0,w1); ⇓(r1,w0)}', el: [['b', ['w0']], ['u', ['r0', 'w1']], ['d', ['r1', 'w0']]], ops: 5 },
    marchc: { n: 'March C−  {⇕(w0); ⇑(r0,w1); ⇑(r1,w0); ⇓(r0,w1); ⇓(r1,w0); ⇕(r0)}', el: [['b', ['w0']], ['u', ['r0', 'w1']], ['u', ['r1', 'w0']], ['d', ['r0', 'w1']], ['d', ['r1', 'w0']], ['b', ['r0']]], ops: 10 }
  };
  var FAULTS = {
    none: 'No fault',
    saf: 'Stuck-at-0 fault in cell 3',
    tf: 'Transition fault: cell 5 cannot rise 0→1',
    cf: 'Coupling fault: a 0→1 write in cell 6 forces cell 2 to 1'
  };
  function run(alg, fault) {
    var m = [0, 0, 0, 0, 0, 0, 0, 0], log = [], det = null;
    function write(a, v) {
      var old = m[a];
      if (fault === 'tf' && a === 5 && old === 0 && v === 1) v = 0;
      m[a] = v;
      if (fault === 'saf') m[3] = 0;
      if (fault === 'cf' && a === 6 && old === 0 && v === 1) m[2] = 1;
    }
    ALG[alg].el.forEach(function (el, ei) {
      var order = el[0] === 'd' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
      order.forEach(function (a) {
        el[1].forEach(function (op) {
          if (op[0] === 'w') write(a, +op[1]);
          else { var exp = +op[1], got = m[a]; if (got !== exp && !det) det = { el: ei, a: a, exp: exp, got: got }; log.push([ei, a, op, got === exp]); }
        });
      });
    });
    return { det: det, log: log };
  }

  /* ---------- Widget: March algorithm simulator ---------- */
  function marchLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>March algorithm simulator · 8-cell memory</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var alg = 'mats', fault = 'saf', found = {}, missed = false, repaired = false, done = false, last = null;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    L.select(row, 'Algorithm', Object.keys(ALG).map(function (k) { return [k, ALG[k].n]; }), alg, function (v) { alg = v; });
    L.select(row, 'Injected fault', Object.keys(FAULTS).map(function (k) { return [k, FAULTS[k]]; }), fault, function (v) { fault = v; });
    row.appendChild(L.btn('▶ Run MBIST', 'pri', function () { last = run(alg, fault); if (fault !== 'none') { if (last.det) found[fault] = 1; else if (alg === 'mats' && fault === 'cf') missed = true; } draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var rep = L.h('div', 'l7-row'); body.appendChild(rep);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      var o = '';
      for (var a = 0; a < N; a++) { var bad = last && last.det && last.det.a === a; o += R(20 + a * 70, 20, 60, 46, bad ? (repaired ? 'box-ok' : 'box-bad') : 'box-on', 6) + T(50 + a * 70, 48, 'cell ' + a, 't-ink t-b t-sm'); }
      o += R(20, 80, 60, 30, repaired ? 'box-ok' : 'box', 6) + T(50, 100, 'spare', 't-dim t-sm');
      if (last) {
        var ops = last.log.length, fails = last.log.filter(function (l) { return !l[3]; }).length;
        o += T(300, 100, ops + ' reads checked · ' + fails + ' mismatches', last.det ? 't-bad t-b t-sm' : 't-ok t-b t-sm');
      }
      pic.innerHTML = S(600, 120, o, 'Memory array');
      out.innerHTML = last ? (last.det ? '❌ <b>Fault detected</b> in element ' + (last.det.el + 1) + ' at cell ' + last.det.a + ': expected ' + last.det.exp + ', read ' + last.det.got : '✅ <b>All reads correct</b> – ' + (fault === 'none' ? 'fault-free memory passes.' : 'this algorithm did not detect the fault!')) + '<br><span class="k">Test length</span> ' + ALG[alg].ops + 'n = ' + ALG[alg].ops * N + ' operations (for a 1 Mbit memory: ' + ALG[alg].ops + ' million)' : 'Choose an algorithm and a fault, then run.';
      rep.innerHTML = '';
      if (last && last.det && !repaired) rep.appendChild(L.btn('🔧 Built-in self-repair: map cell ' + last.det.a + ' to the spare', 'ghost', function () { repaired = true; draw(); }));
      var need = found.saf && found.tf && found.cf && missed;
      verdict.className = 'l7-verdict ' + (need ? 'ok' : 'warn');
      verdict.innerHTML = need ? '✅ All three faults detected – and you saw MATS+ miss the coupling fault<small>March C− orders its elements so every cell is read after its neighbours were written in both directions, which exposes coupling faults. ' + (repaired ? 'You also repaired a cell with redundancy.' : 'Try the repair button after a detection.') + '</small>' :
        'Progress: SAF ' + (found.saf ? '✅' : '○') + ' · TF ' + (found.tf ? '✅' : '○') + ' · CF ' + (found.cf ? '✅' : '○') + ' · MATS+ misses CF ' + (missed ? '✅' : '○') + '<small>Detect every fault, and run MATS+ on the coupling fault to see its weakness.</small>';
      if (need && !done) { done = true; api.done(); }
    }
    draw();
  }

  function mFrame(k) {
    var o = '', el = [['⇕', 'w0', 'write 0 everywhere'], ['⇑', 'r0, w1', 'ascending: read 0, write 1'], ['⇑', 'r1, w0', 'ascending: read 1, write 0'], ['⇓', 'r0, w1', 'descending: read 0, write 1'], ['⇓', 'r1, w0', 'descending: read 1, write 0'], ['⇕', 'r0', 'read 0 everywhere']];
    el.forEach(function (e, i) { var x = 10 + i * 98; o += R(x, 40, 90, 60, i === k ? 'box-on' : i < k ? 'box-ok' : 'box', 8) + T(x + 45, 64, e[0], 't-ink t-b') + T(x + 45, 86, e[1], 't-ink t-sm'); });
    o += T(300, 130, el[k][2], 't-vio t-b t-sm');
    return S(600, 146, o, 'March C− elements');
  }

  L.module({
    n: 5,
    lead: 'Memories fill most of a modern SoC and fail differently from logic. Learn memory fault models, how March algorithms detect them, how MBIST runs them on chip at speed, and how redundancy and built-in self-repair turn faulty memories into good ones.',
    tags: ['memory fault models', 'March algorithms', 'advanced MBIST', 'redundancy', 'repair', 'BISR', 'memory-test architecture'],
    sections: [
      {
        id: 'c-faults', type: 'concept', title: 'Memory fault models', nav: 'Fault models',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Fault</th><th>Behaviour</th></tr><tr><td>Stuck-at (SAF)</td><td>a cell always reads 0 (or 1)</td></tr><tr><td>Transition (TF)</td><td>a cell cannot make a 0→1 (or 1→0) transition</td></tr><tr><td>Coupling (CF)</td><td>an operation on an aggressor cell changes a victim cell</td></tr><tr><td>Address decoder (AF)</td><td>an address reaches no cell, the wrong cell or several cells</td></tr><tr><td>Retention / read-disturb</td><td>a cell loses its value over time or when read</td></tr></table></div><p>(Level 5 mentioned BIST in general; memory-specific testing is new here.)</p>'
      },
      {
        id: 'st-march', type: 'steps', title: 'Animation: the six elements of March C−', nav: 'March C−',
        frames: [0, 1, 2, 3, 4, 5].map(function (k) { return { t: ['Initialise every cell to 0.', 'Ascending: check 0, write 1 – detects stuck-at and rising transitions.', 'Ascending: check 1, write 0.', 'Descending: check 0, write 1 – catches coupling from higher addresses.', 'Descending: check 1, write 0.', 'Final read of 0 everywhere. Total 10n operations.'][k], svg: mFrame(k) }; })
      },
      { id: 'w-march', type: 'widget', title: 'March algorithm simulator', nav: 'March simulator', intro: 'Detect each injected fault, see which algorithm misses the coupling fault, and try the repair.', build: marchLab },
      {
        id: 'c-mbist', type: 'concept', title: 'MBIST architecture, redundancy and repair', nav: 'MBIST & repair',
        html: '<div class="l7-grid2"><div class="l7-box sig"><h4>MBIST controller</h4><p>On-chip address generator, data generator, March-sequence FSM and comparator; one controller can test many memories, started and read through JTAG/IJTAG.</p></div><div class="l7-box cu"><h4>Redundancy & repair</h4><p>Spare rows/columns. MBIST logs failing addresses, a repair analysis allocates spares, and the repair is stored in fuses (hard repair) or applied at every power-up (soft BISR).</p></div></div>'
      },
      {
        id: 'rv-5', type: 'reveal', title: 'Click to reveal: memory test insights', nav: 'Reveal',
        items: [
          { q: 'Why not test memories with scan ATPG?', a: 'Millions of cells, regular structure and memory-specific faults make algorithmic BIST far more efficient.' },
          { q: 'Why does the address order matter?', a: 'Coupling faults show only if the victim is read after the aggressor was written – ascending and descending passes cover both directions.' },
          { q: 'Why is repair so valuable?', a: 'A large SRAM almost always has a few bad cells; spares rescue dies that would otherwise be scrapped – big yield gain.' },
          { q: 'Why run MBIST at speed?', a: 'Some memory faults (e.g. slow sense amplifiers) appear only at operating frequency.' }
        ]
      },
      {
        id: 'dd-5', type: 'drag', title: 'Drag & drop: which memory fault?', nav: 'Drag & drop',
        bins: ['Stuck-at', 'Transition', 'Coupling', 'Address decoder'],
        items: [['cell 7 always reads 1', 0], ['cell 4 cannot change from 1 to 0', 1], ['writing cell 9 flips cell 10', 2], ['address 12 also writes address 44', 3]]
      },
      {
        id: 'calc5', type: 'calc', title: 'Memory test calculations', nav: 'Calculate',
        items: [
          { q: 'March C− is 10n. How many operations for a 64 K-word memory (n = 65,536)?', a: 655360, h: '10 × 65,536.', s: '<b>655,360</b>.' },
          { q: 'At 500 MHz (one operation per cycle), how long does that take (ms, two decimals)?', a: 1.31, tol: 0.01, h: '655,360 / 500 MHz.', s: '≈ <b>1.31 ms</b>.' },
          { q: 'MATS+ is 5n. How many operations for the same memory?', a: 327680, h: '5 × 65,536.', s: '<b>327,680</b>.' }
        ]
      },
      {
        id: 'mcq5', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'March C− has complexity…', o: ['10n', '5n', 'n²', 'log n'], a: 0, w: '' },
          { q: 'Coupling faults need…', o: ['ascending and descending address orders', 'one write only', 'scan chains', 'boundary scan'], a: 0, w: '' },
          { q: 'Built-in self-repair uses…', o: ['spare rows/columns', 'more ATPG patterns', 'LBIST', 'JTAG only'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen5', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Production MBIST with MATS+ passes, but field returns show memory errors where neighbouring cells interact.', q: 'What should change?', o: [{ t: 'Use a stronger March algorithm such as March C− (coupling coverage)', ok: true, w: 'MATS+ misses many coupling faults.' }, { t: 'Run MATS+ twice', ok: false, w: 'Same weakness.' }, { t: 'Remove MBIST', ok: false, w: 'No.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'MBIST tests…', o: ['embedded memories', 'logic only', 'pads', 'clocks'], a: 0, w: '' },
      { d: 'Easy', q: 'A stuck-at memory cell…', o: ['always reads the same value', 'flips neighbours', 'is slow', 'is a decoder fault'], a: 0, w: '' },
      { d: 'Easy', q: 'Spare rows are used for…', o: ['repair', 'test time', 'clocking', 'scan'], a: 0, w: '' },
      { d: 'Medium', q: '⇓ in March notation means…', o: ['descending address order', 'any order', 'write 1', 'read twice'], a: 0, w: '' },
      { d: 'Medium', q: 'MATS+ detects…', o: ['stuck-at faults (not all coupling faults)', 'all coupling faults', 'nothing', 'only decoder faults'], a: 0, w: '' },
      { d: 'Medium', q: 'A transition fault in memory means a cell…', o: ['cannot make one kind of transition', 'is stuck', 'is coupled', 'is unaddressable'], a: 0, w: '' },
      { d: 'Medium', q: 'MBIST is usually started through…', o: ['JTAG / IJTAG', 'the clock tree', 'scan compression', 'the package'], a: 0, w: '' },
      { d: 'Hard', q: '10n test on 1 Mi words at 1 GHz ≈', o: ['10.5 ms', '1 ms', '100 ms', '1 s'], a: 0, w: '10,485,760 ns.' },
      { d: 'Hard', q: 'Soft repair (BISR) is applied…', o: ['at every power-up after MBIST', 'once with a laser', 'in RTL', 'never'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is memory repair a yield booster?', o: ['dies with a few bad cells become sellable', 'it removes all defects', 'it speeds up tests', 'it lowers area'], a: 0, w: '' }
    ]
  });
})();
