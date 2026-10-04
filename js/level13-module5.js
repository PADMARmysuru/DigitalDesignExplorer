/* Level 13 · Module 5 – Superscalar Architecture */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var LAT = { ALU: 1, MUL: 3, MEM: 2 };
  var PROG = [
    { t: 'ld  r1, 0(r9)', u: 'MEM', d: 'r1', s: ['r9'] },
    { t: 'mul r2, r1, r3', u: 'MUL', d: 'r2', s: ['r1', 'r3'] },
    { t: 'add r4, r5, r6', u: 'ALU', d: 'r4', s: ['r5', 'r6'] },
    { t: 'add r5, r7, r8', u: 'ALU', d: 'r5', s: ['r7', 'r8'] },
    { t: 'sub r6, r4, r1', u: 'ALU', d: 'r6', s: ['r4', 'r1'] },
    { t: 'add r2, r10, r11', u: 'ALU', d: 'r2', s: ['r10', 'r11'] },
    { t: 'ld  r12, 4(r9)', u: 'MEM', d: 'r12', s: ['r9'] },
    { t: 'add r13, r12, r4', u: 'ALU', d: 'r13', s: ['r12', 'r4'] }
  ];
  var UNITS = { ALU: 2, MUL: 1, MEM: 1 };
  /* Greedy cycle-by-cycle issue. Returns issue cycle per instruction. */
  function schedule(width, dynamic, rename) {
    var issue = PROG.map(function () { return -1; }), cyc = 0;
    while (issue.some(function (x) { return x < 0; }) && cyc < 200) {
      cyc++;
      var used = { ALU: 0, MUL: 0, MEM: 0 }, n = 0;
      for (var i = 0; i < PROG.length && n < width; i++) {
        if (issue[i] >= 0) continue;
        var I = PROG[i], ok = true;
        if (!dynamic && issue.slice(0, i).some(function (x) { return x < 0 || x > cyc; })) ok = false;       // in-order
        for (var j = 0; j < i && ok; j++) {
          var J = PROG[j];
          if (J.d && I.s.indexOf(J.d) >= 0 && (issue[j] < 0 || issue[j] + LAT[J.u] > cyc)) ok = false;       // RAW (true dependence)
          if (!rename) {
            if (J.s.indexOf(I.d) >= 0 && (issue[j] < 0 || issue[j] > cyc)) ok = false;                          // WAR (false)
            if (J.d === I.d && (issue[j] < 0 || issue[j] + LAT[J.u] > cyc + LAT[I.u] - 1)) ok = false;          // WAW (false)
          }
        }
        if (ok && used[I.u] < UNITS[I.u]) { issue[i] = cyc; used[I.u]++; n++; }
        else if (!dynamic) break;                                                                                // in-order stops at the first blocked instruction
      }
    }
    var end = Math.max.apply(null, issue.map(function (c, i) { return c + LAT[PROG[i].u] - 1; }));
    return { issue: issue, cycles: end, ipc: PROG.length / end };
  }

  /* ---------- Widget: instruction scheduler ---------- */
  function schedLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Instruction scheduler · units: 2 ALU, 1 MUL (3 cycles), 1 MEM (2 cycles)</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var c = { w: 1, dyn: false, ren: false }, best = 0, tried = {}, done = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    L.select(row, 'Issue width', [['1', '1 (scalar)'], ['2', '2-wide'], ['4', '4-wide']], '1', function (v) { c.w = +v; draw(); });
    var bd = L.btn('Dynamic (out-of-order) scheduling: OFF', '', function () { c.dyn = !c.dyn; draw(); }); row.appendChild(bd);
    var br = L.btn('Register renaming: OFF', '', function () { c.ren = !c.ren; draw(); }); row.appendChild(br);
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      bd.innerHTML = 'Dynamic (out-of-order) scheduling: ' + (c.dyn ? 'ON' : 'OFF'); bd.classList.toggle('is-on', c.dyn);
      br.innerHTML = 'Register renaming: ' + (c.ren ? 'ON' : 'OFF'); br.classList.toggle('is-on', c.ren);
      var s = schedule(c.w, c.dyn, c.ren), CW = 40, x0 = 160, o = '';
      tried[c.w + '' + c.dyn + c.ren] = s.ipc; best = Math.max(best, s.ipc);
      for (var k = 1; k <= s.cycles; k++) o += T(x0 + (k - 0.5) * CW, 16, k, 't-dim t-sm');
      PROG.forEach(function (I, i) {
        var y = 24 + i * 28, col = { ALU: '#34c759', MUL: '#af52de', MEM: '#d48a00' }[I.u];
        o += T(6, y + 18, 'I' + (i + 1) + ' ' + I.t, 't-ink t-sm', 'start').replace('class="', 'font-family="JetBrains Mono,monospace" class="');
        o += '<rect x="' + (x0 + (s.issue[i] - 1) * CW + 1) + '" y="' + (y + 3) + '" width="' + (LAT[I.u] * CW - 2) + '" height="22" rx="5" fill="' + col + '" opacity=".8"/>' + T(x0 + (s.issue[i] - 1) * CW + LAT[I.u] * CW / 2, y + 18, I.u, 't-sm').replace('class="', 'fill="#fff" class="');
      });
      pic.innerHTML = S(x0 + s.cycles * CW + 10, 24 + PROG.length * 28 + 6, o, 'Issue schedule');
      out.innerHTML = '<span class="k">Execution cycles</span> ' + s.cycles + ' · <span class="k">IPC</span> <b>' + s.ipc.toFixed(2) + '</b> · <span class="k">CPI</span> ' + (1 / s.ipc).toFixed(2) +
        '<br><span class="k">Dependences</span> true RAW: I1→I2, I1→I5, I3→I5, I3→I8, I7→I8 · false WAR: I3→I4 (r5), I3→I5 (r6) · false WAW: I2→I6 (r2)';
      var ok = s.ipc >= 1.5 && Object.keys(tried).length >= 3;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : 'warn');
      verdict.innerHTML = ok ? '✅ IPC ' + s.ipc.toFixed(2) + ' – more than one instruction per cycle<small>Width alone is not enough: dynamic scheduling lets independent instructions overtake stalled ones, and renaming removes the false WAR/WAW dependences. Only true data dependences remain.</small>'
        : 'Best IPC so far: ' + best.toFixed(2) + '<small>Reach IPC ≥ 1.5 (try at least three configurations). Which features let independent instructions run in parallel?</small>';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  function ilpFrame(k) {
    var o = '', W = [1, 2, 4][Math.min(k, 2)];
    for (var c = 0; c < 6; c++) for (var w = 0; w < 4; w++) { var on = w < W && (k < 3 || (c + w) % 3 !== 2); o += R(60 + c * 80, 20 + w * 30, 70, 24, on ? 'box-on' : 'box', 5); }
    o += T(30, 80, 'slots', 't-dim t-sm');
    o += T(300, 160, ['Scalar: one instruction issued per cycle (IPC ≤ 1)', '2-wide: two issue slots per cycle', '4-wide: four slots – if enough independent instructions exist', 'Dependences leave slots empty: IPC < width'][k], 't-vio t-b t-sm');
    return S(600, 172, o, 'Issue slots');
  }

  L.module({
    n: 5,
    lead: 'Pipelining overlaps instructions in time; superscalar processors also run several side by side. How much parallelism a program really has – its instruction-level parallelism – decides how full the extra issue slots get. Schedule a program yourself.',
    tags: ['single vs multiple issue', 'ILP', 'functional units', 'issue width', 'dependences', 'dynamic scheduling', 'register renaming', 'instruction window'],
    sections: [
      {
        id: 'st-ilp', type: 'steps', title: 'Animation: issue width and ILP', nav: 'Issue width',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['A scalar pipeline issues at most one instruction per cycle.', 'A 2-wide superscalar can issue two.', 'A 4-wide machine needs four independent instructions every cycle.', 'Real code has dependences, so some slots stay empty.'][k], svg: ilpFrame(k) }; })
      },
      {
        id: 'c-dep', type: 'concept', title: 'Dependences, window and renaming', nav: 'Dependences',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Dependence</th><th>Example</th><th>Real?</th></tr><tr><td>RAW (true)</td><td>add r1,…  then  sub …, r1</td><td>yes – data must flow</td></tr><tr><td>WAR (anti)</td><td>read r5, then a later write r5</td><td>no – just a name clash</td></tr><tr><td>WAW (output)</td><td>two writes to r2</td><td>no – just a name clash</td></tr></table></div>' +
          '<p><b>Register renaming</b> maps each architectural register write to a fresh physical register, removing WAR and WAW. The <b>instruction window</b> is the set of instructions the hardware can look at to find independent work.</p>'
      },
      { id: 'w-sched', type: 'widget', title: 'Instruction scheduler', nav: 'Scheduler lab', intro: 'Change width, scheduling and renaming. Reach IPC ≥ 1.5.', build: schedLab },
      {
        id: 'rv-5', type: 'reveal', title: 'Click to reveal: superscalar insights', nav: 'Reveal',
        items: [
          { q: 'Why don\'t CPUs issue 16 instructions per cycle?', a: 'Typical programs rarely have that much ILP, and the dependence-checking logic grows roughly with the square of the width.' },
          { q: 'What limits a wide in-order core?', a: 'One stalled instruction blocks all the younger independent ones behind it.' },
          { q: 'How many physical registers does renaming need?', a: 'Architectural registers + the number of in-flight results (often 128–300 physical registers).' },
          { q: 'What is VLIW?', a: 'The compiler, not the hardware, packs independent instructions into wide bundles.' }
        ]
      },
      {
        id: 'dd-5', type: 'drag', title: 'Drag & drop: RAW, WAR or WAW?', nav: 'Drag & drop',
        bins: ['RAW (true)', 'WAR (false)', 'WAW (false)'],
        items: [['add r1,r2,r3 → sub r4,r1,r5', 0], ['lw r6,0(r1) → add r7,r6,r6', 0], ['add r4,r5,r6 → add r5,r7,r8', 1], ['mul r2,… → add r2,…', 2]]
      },
      {
        id: 'calc5', type: 'calc', title: 'Superscalar calculations', nav: 'Calculate',
        items: [
          { q: '8 instructions finish in 5 cycles. IPC?', a: 1.6, h: '8 / 5.', s: '<b>1.6</b>.' },
          { q: 'A 4-wide core reaches IPC 2.2. Fraction of issue slots used (%)?', a: 55, h: '2.2 / 4.', s: '<b>55 %</b>.' },
          { q: 'IPC rises from 0.8 to 1.6 at the same clock. Speedup?', a: 2, h: 'ratio.', s: '<b>2×</b>.' }
        ]
      },
      {
        id: 'mcq5', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Register renaming removes…', o: ['WAR and WAW dependences', 'RAW dependences', 'cache misses', 'branches'], a: 0, w: '' },
          { q: 'A superscalar core can reach IPC…', o: ['greater than 1', 'only below 1', 'exactly 1', 'zero'], a: 0, w: '' },
          { q: 'ILP means…', o: ['independent instructions that can run in parallel', 'instruction length', 'instruction latency', 'I/O parallelism'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen5', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Doubling the issue width of an in-order core improves IPC by only 5 %.', q: 'Most likely reason?', o: [{ t: 'Stalled instructions block independent ones – dynamic scheduling and renaming are needed', ok: true, w: 'Width needs a scheduler to fill it.' }, { t: 'The cache is too big', ok: false, w: 'Unrelated.' }, { t: 'The clock is too slow', ok: false, w: 'IPC is per cycle.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Issue width is…', o: ['instructions issued per cycle', 'pipeline depth', 'cache size', 'clock rate'], a: 0, w: '' },
      { d: 'Easy', q: 'A true dependence is…', o: ['RAW', 'WAR', 'WAW', 'none'], a: 0, w: '' },
      { d: 'Easy', q: 'IPC = 1 / …', o: ['CPI', 'frequency', 'latency', 'width'], a: 0, w: '' },
      { d: 'Medium', q: '12 instructions in 8 cycles → IPC', o: ['1.5', '0.67', '12', '8'], a: 0, w: '' },
      { d: 'Medium', q: 'Dynamic scheduling lets…', o: ['independent instructions overtake stalled ones', 'branches be removed', 'caches be skipped', 'the clock stop'], a: 0, w: '' },
      { d: 'Medium', q: 'Renaming maps architectural registers to…', o: ['physical registers', 'cache lines', 'pipeline stages', 'branches'], a: 0, w: '' },
      { d: 'Medium', q: 'Multiple functional units are needed for…', o: ['parallel execution of different instructions', 'caching', 'prediction', 'renaming only'], a: 0, w: '' },
      { d: 'Hard', q: 'Why do slots remain empty in a 4-wide core?', o: ['limited ILP and dependences', 'too many registers', 'small caches only', 'fast clocks'], a: 0, w: '' },
      { d: 'Hard', q: 'The instruction window determines…', o: ['how far ahead hardware can search for independent work', 'cache associativity', 'branch target', 'clock skew'], a: 0, w: '' },
      { d: 'Hard', q: 'Without renaming, which pair cannot be reordered? add r4,r5,r6 then add r5,r7,r8', o: ['they have a WAR on r5', 'they are independent', 'RAW on r4', 'WAW on r4'], a: 0, w: '' }
    ]
  });
})();
