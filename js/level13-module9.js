/* Level 13 · Module 9 – Processor Performance */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var BASE = { ic: 2, cpi0: 1.0, f: 2.0, bf: 20, mr: 10, pen: 14, mem: 30, miss: 5, mp: 100 };
  var UPG = [
    { k: 'bp', n: 'Better branch predictor (misprediction 10 % → 4 %)', cost: 2, ap: function (c) { c.mr = 4; } },
    { k: 'l2', n: 'Add an L2 cache (effective miss penalty 100 → 30 cycles)', cost: 3, ap: function (c) { c.mp = 30; } },
    { k: 'l1', n: 'Larger L1 (miss rate 5 % → 3 %)', cost: 2, ap: function (c) { c.miss = 3; } },
    { k: 'freq', n: 'Faster clock 2.0 → 2.6 GHz (deeper pipeline: penalty 14 → 18)', cost: 3, ap: function (c) { c.f = 2.6; c.pen = 18; } },
    { k: 'wide', n: '2-wide superscalar (base CPI 1.0 → 0.6)', cost: 4, ap: function (c) { c.cpi0 = 0.6; } },
    { k: 'comp', n: 'Better compiler (instruction count −10 %)', cost: 1, ap: function (c) { c.ic = 1.8; } }
  ];
  function perf(c) {
    var br = c.bf / 100 * c.mr / 100 * c.pen, mm = c.mem / 100 * c.miss / 100 * c.mp, cpi = c.cpi0 + br + mm;
    return { br: br, mm: mm, cpi: cpi, ipc: 1 / cpi, t: c.ic * 1e9 * cpi / (c.f * 1e9) };
  }

  /* ---------- Widget: processor performance calculator ---------- */
  function perfLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Processor performance calculator · CPU time = IC × CPI × clock period</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var on = {}, btn = {}, done = false, BUDGET = 7, TARGET = 1.40;   // reachable only with the L2 cache (5 valid combinations)
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Program</span> 2 billion instructions · 20 % branches · 30 % memory instructions<br><span class="k">Challenge</span> run it in ≤ ' + TARGET + ' s using at most ' + BUDGET + ' upgrade points'));
    var g = L.h('div', 'l7-choice'); g.style.gridTemplateColumns = '1fr'; body.appendChild(g);
    UPG.forEach(function (u) { var b = L.h('button', '', ''); b.type = 'button'; b.addEventListener('click', function () { on[u.k] = !on[u.k]; draw(); }); btn[u.k] = b; g.appendChild(b); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      var c = Object.assign({}, BASE), cost = 0;
      UPG.forEach(function (u) { btn[u.k].className = on[u.k] ? 'is-pick' : ''; btn[u.k].innerHTML = (on[u.k] ? '☑ ' : '☐ ') + u.n + ' · <b>' + u.cost + ' pt</b>'; if (on[u.k]) { u.ap(c); cost += u.cost; } });
      var p = perf(c), b = perf(BASE), o = '';
      var parts = [['base CPI', c.cpi0, '#0071e3'], ['branch stalls', p.br, '#af52de'], ['memory stalls', p.mm, '#d48a00']], x = 120, sc = 200;
      o += T(110, 34, 'CPI', 't-ink t-b t-sm', 'end');
      parts.forEach(function (q) { var w = q[1] * sc; o += '<rect x="' + x + '" y="18" width="' + w + '" height="26" fill="' + q[2] + '" opacity=".85"/>'; if (w > 50) o += T(x + w / 2, 36, q[1].toFixed(2), 't-sm').replace('class="', 'fill="#fff" class="'); x += w; });
      o += T(x + 8, 36, '= ' + p.cpi.toFixed(2), 't-ink t-b', 'start');
      parts.forEach(function (q, i) { o += '<rect x="' + (120 + i * 150) + '" y="56" width="12" height="12" fill="' + q[2] + '"/>' + T(138 + i * 150, 66, q[0], 't-dim t-sm', 'start'); });
      pic.innerHTML = S(600, 80, o, 'CPI stack');
      out.innerHTML = '<span class="k">CPI</span> ' + p.cpi.toFixed(2) + ' · <span class="k">IPC</span> ' + p.ipc.toFixed(2) + ' · <span class="k">clock</span> ' + c.f + ' GHz (period ' + (1 / c.f).toFixed(3) + ' ns) · <span class="k">instructions</span> ' + c.ic + ' × 10⁹' +
        '<br><span class="k">CPU time</span> <b>' + p.t.toFixed(3) + ' s</b> · <span class="k">speedup vs baseline</span> ' + (b.t / p.t).toFixed(2) + '× · <span class="k">upgrade points</span> ' + cost + ' / ' + BUDGET;
      var ok = p.t <= TARGET && cost <= BUDGET;
      verdict.className = 'l7-verdict ' + (ok ? 'ok' : cost > BUDGET ? 'bad' : 'warn');
      verdict.innerHTML = ok ? '✅ ' + p.t.toFixed(3) + ' s within budget<small>Look at the CPI stack: attack the biggest component first. Memory stalls dominate the baseline, so the L2 cache is worth more than raw clock speed – and a faster clock with a deeper pipeline also increases the branch penalty.</small>'
        : cost > BUDGET ? '❌ Over budget (' + cost + ' points)<small>Which upgrade gives the least time per point?</small>' : 'CPU time ' + p.t.toFixed(3) + ' s – target ' + TARGET + ' s<small>Baseline: ' + b.t.toFixed(3) + ' s with CPI ' + b.cpi.toFixed(2) + '.</small>';
      if (ok && !done) { done = true; api.done(); }
    }
    draw();
  }

  function ironFrame(k) {
    var o = '', t = [['Instruction count', 'algorithm, compiler, ISA'], ['CPI', 'microarchitecture: pipeline, prediction, caches, issue width'], ['Clock period', 'technology and circuit design (Levels 7–8), pipeline depth']];
    t.forEach(function (x, i) { o += R(30 + i * 190, 40, 170, 70, i === k ? 'box-on' : 'box', 10) + T(115 + i * 190, 70, x[0], 't-ink t-b t-sm') + T(115 + i * 190, 92, x[1].length > 30 ? x[1].slice(0, 30) + '…' : x[1], 't-dim t-sm'); if (i < 2) o += T(210 + i * 190, 80, '×', 't-ink t-b'); });
    o += T(300, 140, ['Fewer instructions → less work', 'Fewer cycles per instruction → faster', 'Shorter cycles → faster – but deeper pipelines raise penalties'][k], 't-vio t-b t-sm');
    return S(600, 156, o, 'Performance equation');
  }

  L.module({
    n: 9,
    lead: 'All the architecture ideas of this level meet in one equation. CPU time depends on how many instructions run, how many cycles each takes and how long a cycle is. Learn to break CPI into its components and decide which improvement really pays.',
    tags: ['execution time', 'clock frequency', 'clock period', 'instruction count', 'CPI', 'IPC', 'throughput', 'latency', 'speedup', 'branch impact', 'cache impact'],
    sections: [
      {
        id: 'st-iron', type: 'steps', title: 'Animation: the performance equation', nav: 'CPU time',
        frames: [0, 1, 2].map(function (k) { return { t: ['CPU time = <b>instruction count</b> × CPI × clock cycle time.', '<b>CPI</b> = base CPI + branch stalls + memory stalls (+ other hazards).', '<b>Clock cycle time</b> = 1 / frequency.'][k], svg: ironFrame(k) }; })
      },
      {
        id: 'c-cpi', type: 'concept', title: 'CPI components, IPC and speedup', nav: 'CPI stack',
        html: '<div class="l7-eq">CPI = CPI_base + (branch freq × mispredict rate × penalty) + (memory refs/instr × miss rate × miss penalty)      IPC = 1 / CPI      Speedup = T_old / T_new</div>' +
          '<p><b>Amdahl\'s law</b>: improving a part that takes fraction f of the time by factor s gives an overall speedup of 1 / ((1 − f) + f / s) – speeding up a small part barely helps.</p>'
      },
      { id: 'w-perf', type: 'widget', title: 'Processor performance calculator', nav: 'Performance calculator', intro: 'Choose upgrades to reach the target CPU time within the budget.', build: perfLab },
      {
        id: 'rv-9', type: 'reveal', title: 'Click to reveal: performance insights', nav: 'Reveal',
        items: [
          { q: 'Why is clock frequency alone a poor measure?', a: 'A faster clock with a much higher CPI (or more instructions) can be slower overall.' },
          { q: 'What is throughput vs latency here?', a: 'Throughput: instructions (or tasks) completed per second. Latency: time for one instruction or task.' },
          { q: 'Why do benchmarks matter?', a: 'CPI depends on the program – branch and memory behaviour vary enormously between workloads.' },
          { q: 'How does power limit performance?', a: 'Dynamic power ∝ C·V²·f (Level 8): higher frequency needs higher voltage, so power rises steeply.' }
        ]
      },
      {
        id: 'dd-9', type: 'drag', title: 'Drag & drop: which term does it change?', nav: 'Drag & drop',
        bins: ['Instruction count', 'CPI', 'Clock period'],
        items: [['better compiler optimisation', 0], ['richer ISA instructions', 0], ['better branch predictor', 1], ['bigger cache', 1], ['faster transistors', 2], ['deeper pipeline', 2]]
      },
      {
        id: 'calc9', type: 'calc', title: 'Performance calculations', nav: 'Calculate',
        items: [
          { q: '10⁹ instructions, CPI 1.5, 2 GHz. CPU time (s)?', a: 0.75, h: 'IC × CPI / f.', s: '<b>0.75 s</b>.' },
          { q: 'CPI_base 1, 20 % branches, 10 % mispredicted, penalty 14; 30 % memory refs, 5 % miss, penalty 100. CPI?', a: 2.78, tol: 0.01, h: '1 + 0.28 + 1.5.', s: '<b>2.78</b>.' },
          { q: 'Amdahl: 40 % of time is sped up 4×. Overall speedup (two decimals)?', a: 1.43, tol: 0.01, h: '1 / (0.6 + 0.1).', s: '<b>1.43×</b>.' }
        ]
      },
      {
        id: 'mcq9', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'IPC 2 means CPI =', o: ['0.5', '2', '1', '4'], a: 0, w: '' },
          { q: 'A larger cache mainly reduces…', o: ['memory stall cycles', 'instruction count', 'clock period', 'branch frequency'], a: 0, w: '' },
          { q: 'Speedup is…', o: ['old time / new time', 'new time / old time', 'IPC × CPI', 'frequency / CPI'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen9', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A design team can either raise the clock by 30 % (adding 4 cycles to the branch penalty) or cut the cache miss rate in half. Memory stalls are 55 % of CPI.', q: 'Which is likely better?', o: [{ t: 'Halve the miss rate – it attacks the largest CPI component', ok: true, w: 'Amdahl: improve the biggest part.' }, { t: 'Always the clock', ok: false, w: 'It also raises CPI.' }, { t: 'Neither changes performance', ok: false, w: 'Both do.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'CPU time =', o: ['IC × CPI × cycle time', 'IC + CPI', 'CPI / frequency only', 'IPC × frequency'], a: 0, w: '' },
      { d: 'Easy', q: 'Cycle time of a 2.5 GHz clock =', o: ['0.4 ns', '2.5 ns', '4 ns', '0.25 ns'], a: 0, w: '' },
      { d: 'Easy', q: 'Lower CPI means…', o: ['fewer cycles per instruction', 'more instructions', 'slower clock', 'larger cache'], a: 0, w: '' },
      { d: 'Medium', q: '2×10⁹ instr, CPI 1.2, 3 GHz → time', o: ['0.8 s', '7.2 s', '1.2 s', '2.4 s'], a: 0, w: '' },
      { d: 'Medium', q: 'Branch CPI contribution with 25 % branches, 8 % miss, 10-cycle penalty =', o: ['0.2', '0.8', '2.0', '0.02'], a: 0, w: '' },
      { d: 'Medium', q: 'IPC 1.6 → CPI ≈', o: ['0.625', '1.6', '0.16', '6.25'], a: 0, w: '' },
      { d: 'Medium', q: 'Deeper pipelines typically increase…', o: ['frequency and misprediction penalty', 'instruction count', 'cache hit rate', 'nothing'], a: 0, w: '' },
      { d: 'Hard', q: 'Amdahl: 20 % sped up infinitely → max speedup', o: ['1.25', '5', '2', 'infinite'], a: 0, w: '1 / 0.8.' },
      { d: 'Hard', q: 'Old 1.2 s, new 0.8 s → speedup', o: ['1.5×', '0.67×', '2×', '0.4×'], a: 0, w: '' },
      { d: 'Hard', q: 'Why can a 4 GHz CPU be slower than a 3 GHz one?', o: ['higher CPI or more instructions', 'it cannot', 'smaller transistors', 'lower power'], a: 0, w: '' }
    ]
  });
})();
