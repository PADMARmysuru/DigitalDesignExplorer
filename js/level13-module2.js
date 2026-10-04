/* Level 13 · Module 2 – Pipelined Processors */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var PROG = [
    { t: 'lw  r1, 0(r2)', d: 'r1', s: ['r2'], load: true },
    { t: 'add r3, r1, r4', d: 'r3', s: ['r1', 'r4'] },
    { t: 'sub r5, r3, r6', d: 'r5', s: ['r3', 'r6'] },
    { t: 'beq r5, r0, L1', d: null, s: ['r5', 'r0'], br: true },
    { t: 'and r7, r5, r8', d: 'r7', s: ['r5', 'r8'] },
    { t: 'or  r9, r7, r1', d: 'r9', s: ['r7', 'r1'] }
  ];
  /* ID-stage cycle of every instruction under a hazard policy; IF = ID−1, EX = ID+1, MEM = ID+2, WB = ID+3 */
  function schedule(fwd, brPolicy) {
    var id = [], why = [];
    PROG.forEach(function (ins, i) {
      var c = i ? id[i - 1] + 1 : 2, w = '';
      ins.s.forEach(function (r) {
        for (var j = i - 1; j >= 0; j--) if (PROG[j].d === r) {
          var need = fwd ? (PROG[j].load ? id[j] + 2 : id[j] + 1) : id[j] + 3;   // forwarding: load-use 1 stall; else wait for WB
          if (need > c) { c = need; w = (fwd ? 'load-use' : 'RAW on ' + r) + ' with I' + (j + 1); }
          break;
        }
      });
      if (i && PROG[i - 1].br && brPolicy === 'stall') { var nb = id[i - 1] + 3; if (nb > c) { c = nb; w = 'control hazard: wait for branch in EX'; } }
      id.push(c); why.push(w);
    });
    return { id: id, why: why, cycles: id[id.length - 1] + 3, stalls: id.reduce(function (s, c, i) { return s + (i ? c - id[i - 1] - 1 : 0); }, 0) };
  }

  /* ---------- Widget: pipeline simulator ---------- */
  function pipeLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Pipeline simulator · 5-stage RISC pipeline, cycle by cycle</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var fwd = false, br = 'stall', shown = 0, seen = {}, done = false;
    var row = L.h('div', 'l7-row'); body.appendChild(row);
    var bf = L.btn('Forwarding: OFF', '', function () { fwd = !fwd; shown = 99; draw(); }); row.appendChild(bf);
    L.select(row, 'Branch handling (branch is not taken)', [['stall', 'Stall until resolved'], ['predict', 'Predict not-taken']], br, function (v) { br = v; shown = 99; draw(); });
    var row2 = L.h('div', 'l7-row'); body.appendChild(row2);
    row2.appendChild(L.btn('▶ Next cycle', 'pri', function () { shown++; draw(); }));
    row2.appendChild(L.btn('⏭ Run to end', 'ghost', function () { shown = 99; draw(); }));
    row2.appendChild(L.btn('↺ Restart', 'ghost', function () { shown = 0; draw(); }));
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      bf.innerHTML = 'Forwarding: ' + (fwd ? 'ON' : 'OFF'); bf.classList.toggle('is-on', fwd);
      var sc = schedule(fwd, br), CW = 34, x0 = 150, y0 = 34, RH = 30, o = '', max = sc.cycles;
      var upto = Math.min(shown, max);
      for (var c = 1; c <= max; c++) o += T(x0 + (c - 0.5) * CW, 22, c, c === upto ? 't-ink t-b t-sm' : 't-dim t-sm');
      PROG.forEach(function (ins, i) {
        var y = y0 + i * RH, ID = sc.id[i];
        o += T(6, y + 19, 'I' + (i + 1) + ' ' + ins.t, 't-ink t-sm', 'start').replace('class="', 'font-family="JetBrains Mono,monospace" class="');
        var cells = [[ID - 1, 'IF']];
        var prevID = i ? sc.id[i - 1] : ID;
        for (var st = (i ? prevID + 1 : ID); st < ID; st++) cells.push([st, 'stall']);
        cells.push([ID, 'ID'], [ID + 1, 'EX'], [ID + 2, 'MEM'], [ID + 3, 'WB']);
        if (i && cells.length > 5) cells[0][0] = sc.id[i - 1];          // instruction waits in IF while stalled
        cells.forEach(function (cl) {
          if (cl[0] > upto) return;
          var col = cl[1] === 'stall' ? '#ff9500' : { IF: '#0071e3', ID: '#5856d6', EX: '#34c759', MEM: '#d48a00', WB: '#e5332a' }[cl[1]];
          o += '<rect x="' + (x0 + (cl[0] - 1) * CW + 1) + '" y="' + (y + 3) + '" width="' + (CW - 2) + '" height="' + (RH - 6) + '" rx="4" fill="' + col + '" opacity="' + (cl[1] === 'stall' ? 0.35 : 0.8) + '"/>' +
            T(x0 + (cl[0] - 0.5) * CW, y + 20, cl[1] === 'stall' ? '·' : cl[1], 't-sm').replace('class="', 'fill="#fff" font-size="9" class="');
        });
      });
      pic.innerHTML = S(x0 + max * CW + 10, y0 + PROG.length * RH + 6, o, 'Pipeline diagram');
      var cpi = ((sc.cycles - 4) / PROG.length);
      out.innerHTML = '<span class="k">Cycle</span> ' + upto + ' / ' + max + ' · <span class="k">stall cycles</span> ' + sc.stalls + ' · <span class="k">total cycles</span> ' + sc.cycles + ' · <span class="k">CPI (steady state)</span> ' + cpi.toFixed(2) +
        '<br>' + sc.why.map(function (w, i) { return w ? '<span class="c">I' + (i + 1) + ' stalls: ' + w + '</span>' : ''; }).filter(Boolean).join(' · ');
      if (upto >= max) seen[(fwd ? 'F' : 'N') + br] = sc.cycles;
      var best = seen.Fpredict, worst = seen.Nstall;
      verdict.className = 'l7-verdict ' + (best && worst ? 'ok' : 'warn');
      verdict.innerHTML = best && worst ? '✅ ' + worst + ' cycles without forwarding (stalling on branches) vs ' + best + ' with forwarding + predict-not-taken<small>Forwarding removes all ALU-to-ALU stalls; only the load-use hazard still needs one bubble. Predicting the branch avoids waiting for it.</small>'
        : 'Run the program to the end in both extremes: no forwarding + stall, and forwarding + predict-not-taken.<small>Orange cells are stall bubbles.</small>';
      if (best && worst && !done) { done = true; api.done(); }
    }
    draw();
  }

  /* ---------- Widget: hazard classifier ---------- */
  function hazDrill(root, api) {
    L.drill(root, api, {
      bar: 'Which hazard is it – and how is it solved?', label: 'Situation',
      items: [
        { q: '<code>add r1,r2,r3</code> followed by <code>sub r4,r1,r5</code>.', o: ['Data hazard (RAW) – forwarding EX→EX removes the stall', 'Structural hazard', 'Control hazard', 'No hazard'], a: 0, w: 'sub needs r1 before add writes it back.' },
        { q: '<code>lw r1,0(r2)</code> followed immediately by <code>add r3,r1,r4</code>.', o: ['Load-use data hazard – one stall even with forwarding', 'No stall with forwarding', 'Structural hazard', 'Control hazard'], a: 0, w: 'The data is only available after MEM.' },
        { q: 'One memory port must serve both instruction fetch and a load in the same cycle.', o: ['Structural hazard – separate instruction/data memories (caches)', 'Data hazard', 'Control hazard', 'Forwarding solves it'], a: 0, w: 'Two stages compete for one resource.' },
        { q: 'A taken branch is resolved in EX; two younger instructions were already fetched.', o: ['Control hazard – flush them (or predict better)', 'Data hazard', 'Structural hazard', 'No effect'], a: 0, w: 'The wrong-path instructions must be squashed.' }
      ]
    });
  }

  function pFrame(k) {
    var o = '', st = ['IF', 'ID', 'EX', 'MEM', 'WB'], col = ['#0071e3', '#5856d6', '#34c759', '#d48a00', '#e5332a'];
    for (var i = 0; i < 4; i++) for (var s = 0; s < 5; s++) { var c = i + s; if (c > k + 3) continue; o += '<rect x="' + (100 + c * 60) + '" y="' + (20 + i * 34) + '" width="56" height="28" rx="5" fill="' + col[s] + '" opacity=".8"/>' + T(128 + c * 60, 39 + i * 34, st[s], 't-sm').replace('class="', 'fill="#fff" class="'); }
    for (i = 0; i < 4; i++) o += T(90, 39 + i * 34, 'I' + (i + 1), 't-ink t-b t-sm', 'end');
    o += T(330, 172, ['Each instruction moves one stage per cycle', 'Up to five instructions in flight at once', 'After filling, one instruction completes every cycle', 'Throughput ≈ 5× a single-cycle CPU (ideal)'][k], 't-vio t-b t-sm');
    return S(640, 182, o, 'Pipeline');
  }

  L.module({
    n: 2,
    lead: 'Pipelining is the most important idea in processor performance: split instruction execution into stages and overlap them, like an assembly line. Learn how throughput and latency change, and how data, control and structural hazards are handled.',
    tags: ['IF ID EX MEM WB', 'throughput', 'latency', 'structural hazards', 'data hazards', 'control hazards', 'forwarding', 'stalling', 'flushing'],
    sections: [
      {
        id: 'st-pipe', type: 'steps', title: 'Animation: overlapping instructions', nav: 'Pipelining',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['I1 enters IF; next cycle it moves to ID and I2 enters IF.', 'The pipeline fills: five instructions occupy five stages.', 'Once full, one instruction finishes every cycle.', 'Latency per instruction is still 5 cycles – but throughput is up to 5× higher, and the clock is set by the slowest stage.'][k], svg: pFrame(k) }; })
      },
      {
        id: 'c-tl', type: 'concept', title: 'Throughput, latency and hazards', nav: 'Hazards',
        html: '<div class="l7-eq">Pipelined time ≈ (stages + N − 1) × stage time      speedup → number of stages (ideal)</div>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Structural</h4><p>two instructions need the same hardware in the same cycle</p></div><div class="l7-box cu"><h4>Data</h4><p>an instruction needs a result that is not written yet (RAW)</p></div><div class="l7-box vio"><h4>Control</h4><p>the next PC depends on a branch not yet resolved</p></div></div>' +
          '<p style="margin-top:12px"><b>Solutions:</b> forwarding (bypass results from EX/MEM back to EX), stalling (insert bubbles), flushing (squash wrong-path instructions), and prediction (Module 3).</p>'
      },
      { id: 'w-pipe', type: 'widget', title: 'Pipeline simulator', nav: 'Pipeline simulator', intro: 'Step the program cycle by cycle. Compare no forwarding + stall-on-branch with forwarding + predict-not-taken.', build: pipeLab },
      { id: 'w-haz', type: 'widget', title: 'Hazard classifier', nav: 'Hazard drill', intro: 'Identify each hazard and its fix.', build: hazDrill },
      {
        id: 'rv-2', type: 'reveal', title: 'Click to reveal: pipeline insights', nav: 'Reveal',
        items: [
          { q: 'Why can\'t forwarding fix the load-use hazard?', a: 'The loaded value is only available at the end of MEM, but the next instruction needs it at the start of EX one cycle earlier.' },
          { q: 'Why does the register file write in the first half and read in the second?', a: 'So an instruction in ID can read a value written by WB in the same cycle, removing one stall.' },
          { q: 'Why don\'t pipelines have 50 stages?', a: 'Pipeline registers add delay, hazard penalties grow with depth, and power rises.' },
          { q: 'What is a bubble?', a: 'An empty slot (a NOP) inserted into the pipeline during a stall.' }
        ]
      },
      {
        id: 'dd-2', type: 'drag', title: 'Drag & drop: fix the hazard', nav: 'Drag & drop',
        bins: ['Forwarding', 'Stall', 'Flush'],
        items: [['ALU result needed by the next ALU instruction', 0], ['MEM result forwarded to EX', 0], ['load immediately followed by its user', 1], ['branch outcome unknown, no prediction', 1], ['branch mispredicted – remove wrong-path instructions', 2]]
      },
      {
        id: 'calc2', type: 'calc', title: 'Pipeline calculations', nav: 'Calculate',
        items: [
          { q: '5-stage pipeline, 100 instructions, no stalls: total cycles?', a: 104, h: 'k + N − 1.', s: '5 + 100 − 1 = <b>104</b>.' },
          { q: 'Single-cycle: 100 instructions × 750 ps. Pipelined: 104 cycles × 200 ps. Speedup (two decimals)?', a: 3.61, tol: 0.01, h: '75,000 / 20,800.', s: '≈ <b>3.61×</b>.' },
          { q: 'Base CPI 1, 20 % loads, half of them followed by a dependent instruction (1 stall). Effective CPI?', a: 1.1, h: '1 + 0.2 × 0.5 × 1.', s: '<b>1.10</b>.' }
        ]
      },
      {
        id: 'mcq2', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Pipelining mainly improves…', o: ['throughput', 'single-instruction latency', 'code size', 'memory size'], a: 0, w: '' },
          { q: 'A RAW hazard is a…', o: ['data hazard', 'control hazard', 'structural hazard', 'cache miss'], a: 0, w: '' },
          { q: 'Flushing is needed after…', o: ['a mispredicted branch', 'a forwarded result', 'a cache hit', 'every add'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen2', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A compiler can reorder instructions. Code has lw r1 then immediately add r2, r1, r3, followed by an independent sub.', q: 'Best software fix?', o: [{ t: 'Move the independent sub between the load and the add', ok: true, w: 'Fills the load-use slot – no stall.' }, { t: 'Add a NOP', ok: false, w: 'Same cost as the stall.' }, { t: 'Disable forwarding', ok: false, w: 'Worse.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'The classic RISC pipeline has… stages', o: ['5', '3', '8', '2'], a: 0, w: '' },
      { d: 'Easy', q: 'Forwarding is also called…', o: ['bypassing', 'flushing', 'stalling', 'renaming'], a: 0, w: '' },
      { d: 'Easy', q: 'A control hazard comes from…', o: ['branches', 'loads', 'caches', 'ALU ops'], a: 0, w: '' },
      { d: 'Medium', q: '4-stage pipeline, 10 instructions, no stalls: cycles =', o: ['13', '40', '14', '10'], a: 0, w: '' },
      { d: 'Medium', q: 'Load-use with forwarding costs…', o: ['1 stall', '0 stalls', '3 stalls', '5 stalls'], a: 0, w: '' },
      { d: 'Medium', q: 'The pipeline clock is limited by…', o: ['the slowest stage', 'the fastest stage', 'the number of registers', 'the cache size'], a: 0, w: '' },
      { d: 'Medium', q: 'A structural hazard is fixed by…', o: ['adding/duplicating the shared resource', 'forwarding', 'renaming', 'flushing'], a: 0, w: '' },
      { d: 'Hard', q: 'Without forwarding, a dependent ALU instruction right after an ALU instruction waits about…', o: ['2 cycles (until WB)', '0 cycles', '5 cycles', '10 cycles'], a: 0, w: '' },
      { d: 'Hard', q: 'Deeper pipelines increase…', o: ['branch misprediction penalty', 'CPI to zero', 'code size', 'register count'], a: 0, w: '' },
      { d: 'Hard', q: 'Predict-not-taken costs nothing when the branch is…', o: ['not taken', 'taken', 'indirect', 'always'], a: 0, w: '' }
    ]
  });
})();
