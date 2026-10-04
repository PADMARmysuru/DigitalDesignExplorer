/* Level 13 · Module 10 – Processor Architecture Project: Build a Mini Processor */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  /* ---- programs: instruction count, dependency statistics, branch trace, data-address trace ---- */
  function prog(k) {
    var br = [], ad = [], i, j, ic, lu, alu;
    if (k === 'loop') {                                    // nested loop summing an array (sequential accesses)
      for (i = 0; i < 12; i++) for (j = 0; j < 8; j++) { br.push([0x40, j < 7]); ad.push(0x1000 + (i * 8 + j) * 4); }
      for (i = 0; i < 12; i++) br.push([0x50, i < 11]);
      ic = 96 * 5 + 12 * 3; lu = 96; alu = 96;
    } else if (k === 'matrix') {                           // column-wise matrix walk (stride 64 B)
      for (i = 0; i < 12; i++) for (j = 0; j < 8; j++) { br.push([0x40, j < 7]); ad.push(0x2000 + j * 64 + i * 4); }
      for (i = 0; i < 12; i++) br.push([0x50, i < 11]);
      ic = 96 * 6 + 12 * 3; lu = 96; alu = 192;
    } else {                                               // data-dependent branches correlated with the previous branch
      for (i = 0; i < 96; i++) { var a = (i % 3) !== 2; br.push([0x60, a]); br.push([0x64, !a]); br.push([0x70, i < 95]); ad.push(0x3000 + (i % 16) * 4); }
      ic = 96 * 7; lu = 96; alu = 96 * 2;
    }
    return { ic: ic, br: br, ad: ad, lu: lu, alu: alu };
  }
  function predict(kind, br) {
    var t2 = {}, gh = 0, miss = 0;
    br.forEach(function (b) {
      var pc = b[0], tk = b[1], p;
      if (kind === 'taken') p = true;
      else if (kind === 'bimodal') { var c = t2[pc] === undefined ? 1 : t2[pc]; p = c >= 2; t2[pc] = tk ? Math.min(3, c + 1) : Math.max(0, c - 1); }
      else { var ix = ((pc >> 2) ^ gh) & 255, g = t2[ix] === undefined ? 1 : t2[ix]; p = g >= 2; t2[ix] = tk ? Math.min(3, g + 1) : Math.max(0, g - 1); gh = ((gh << 1) | (tk ? 1 : 0)) & 255; }   // 8-bit global history
      if (p !== tk) miss++;
    });
    return miss;
  }
  function cacheSim(cfg, ad) {
    var block = 64, lines = cfg.size / block, ways = cfg.assoc, sets = lines / ways, store = {}, hits = 0, clock = 0;
    ad.forEach(function (a) {
      var blk = Math.floor(a / block), set = blk % sets, tag = Math.floor(blk / sets), s = store[set] || (store[set] = []);
      clock++;
      var w = s.filter(function (x) { return x.t === tag; })[0];
      if (w) { hits++; w.u = clock; } else { if (s.length >= ways) s.sort(function (x, y) { return x.u - y.u; }).shift(); s.push({ t: tag, u: clock }); }
    });
    return hits;
  }
  function simulate(c) {
    var p = prog(c.prog), single = c.dp === 'single';
    var mis = single ? 0 : predict(c.bp, p.br), hits = cacheSim({ size: c.size, assoc: c.assoc }, p.ad), misses = p.ad.length - hits;
    var period = single ? 5 : 1, cycles, stalls = 0;
    if (single) cycles = p.ic + misses * 4;
    else {
      stalls = c.fwd ? p.lu : p.lu * 2 + p.alu * 2;
      var ilp = c.width === 2 ? 1.6 : 1;
      cycles = Math.ceil(p.ic / ilp) + 4 + stalls + mis * 2 + misses * 20;
    }
    return { ic: p.ic, cycles: cycles, cpi: cycles / p.ic, ipc: p.ic / cycles, time: cycles * period, branches: p.br.length, mis: mis, acc: single ? null : 100 * (1 - mis / p.br.length), hitRate: 100 * hits / p.ad.length, stalls: stalls, period: period };
  }

  /* ---------- Widget: build a mini processor ---------- */
  function cpuLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>🏆 Build a mini processor · configure, run, read the report</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var c = { dp: 'single', fwd: false, bp: 'taken', width: 1, size: 256, assoc: 1, prog: 'loop' }, base = {}, done = false, runs = 0;
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Goal</span> for the chosen program: at least <b>4× faster</b> than the single-cycle baseline, with branch accuracy ≥ 85 % and cache hit rate ≥ 90 %.'));
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    function sel(parent, label, opts, key, num) { var r = L.h('div', 'l7-row'); parent.appendChild(r); L.select(r, label, opts, String(c[key]), function (v) { c[key] = num ? +v : v; }); }
    sel(c1, '1 · Datapath', [['single', 'Single-cycle (5 ns clock)'], ['pipe', '5-stage pipeline (1 ns clock)']], 'dp');
    sel(c1, '2 · Pipeline hazard handling', [['false', 'Stall on every dependency'], ['true', 'Forwarding (only load-use stalls)']], 'fwd');
    sel(c1, '3 · Branch predictor', [['taken', 'Static: always taken'], ['bimodal', '2-bit bimodal'], ['gshare', 'Gshare (global history)']], 'bp');
    sel(c2, '4 · Issue width', [['1', '1 (scalar)'], ['2', '2-wide superscalar']], 'width', true);
    sel(c2, '5 · Data cache', [['256', '256 B'], ['1024', '1 KB']], 'size', true);
    sel(c2, '   associativity', [['1', 'direct-mapped'], ['2', '2-way set-associative (LRU)']], 'assoc', true);
    sel(c2, '6 · Instruction sequence', [['loop', 'Array-sum loop'], ['matrix', 'Matrix column walk'], ['branchy', 'Correlated branches']], 'prog');
    c.fwd = false;
    body.appendChild(L.btn('▶ Run program and generate report', 'pri', function () { c.fwd = String(c.fwd) === 'true'; run(); }));
    var rep = L.h('div', ''); body.appendChild(rep);
    function run() {
      runs++;
      if (!base[c.prog]) base[c.prog] = simulate({ dp: 'single', fwd: false, bp: 'taken', width: 1, size: 256, assoc: 1, prog: c.prog });
      var r = simulate(c), b = base[c.prog], speed = b.time / r.time;
      var ok = speed >= 4 && r.acc !== null && r.acc >= 85 && r.hitRate >= 90;
      rep.innerHTML = '<div class="l7-table-wrap"><table class="l7-cmp"><tr><th>Report</th><th>Your processor</th><th>Single-cycle baseline</th></tr>' +
        '<tr><td>Instructions</td><td>' + r.ic + '</td><td>' + b.ic + '</td></tr>' +
        '<tr><td>Execution cycles</td><td>' + r.cycles + ' (× ' + r.period + ' ns)</td><td>' + b.cycles + ' (× 5 ns)</td></tr>' +
        '<tr><td>CPI / IPC</td><td>' + r.cpi.toFixed(2) + ' / ' + r.ipc.toFixed(2) + '</td><td>' + b.cpi.toFixed(2) + ' / ' + b.ipc.toFixed(2) + '</td></tr>' +
        '<tr><td>Pipeline stalls (data hazards)</td><td>' + r.stalls + '</td><td>–</td></tr>' +
        '<tr><td>Branches / mispredictions</td><td>' + r.branches + ' / ' + (r.acc === null ? '–' : r.mis) + '</td><td>no prediction needed</td></tr>' +
        '<tr><td>Branch prediction accuracy</td><td class="' + (r.acc !== null && r.acc >= 85 ? 'better' : 'worse') + '">' + (r.acc === null ? '–' : r.acc.toFixed(1) + ' %') + '</td><td>–</td></tr>' +
        '<tr><td>Cache hit rate</td><td class="' + (r.hitRate >= 90 ? 'better' : 'worse') + '">' + r.hitRate.toFixed(1) + ' %</td><td>' + b.hitRate.toFixed(1) + ' %</td></tr>' +
        '<tr><td>Execution time</td><td class="' + (speed >= 4 ? 'better' : 'worse') + '">' + r.time + ' ns (' + speed.toFixed(2) + '× faster)</td><td>' + b.time + ' ns</td></tr></table></div>' +
        '<div class="l7-verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '🏆 Goal reached' : '❌ Goal not reached yet') + '<small>' +
        (ok ? 'Pipelining shortened the clock, forwarding removed most stalls, the predictor and cache kept the pipeline fed. Try the other programs: each stresses a different part of the processor.' :
          [c.dp === 'single' ? 'a single-cycle datapath needs a 5 ns clock for every instruction' : '', c.dp === 'pipe' && !c.fwd ? 'stalling on every dependency wastes many cycles' : '', r.acc !== null && r.acc < 85 ? 'too many mispredictions for this branch pattern' : '', r.hitRate < 90 ? 'the cache does not fit this access pattern (conflicts or capacity)' : ''].filter(Boolean).join(' · ') || 'not fast enough yet') + '</small></div>';
      if (ok && !done) { done = true; api.done(); }
    }
  }

  function archFrame(k) {
    var st = ['Fetch + predictor', 'Decode', 'Issue (×width)', 'Execute + forward', 'Memory + cache', 'Write-back'], o = '';
    st.forEach(function (s, i) { var x = 6 + i * 99; o += R(x, 50, 92, 50, i <= k * 2 ? 'box-on' : 'box', 8) + T(x + 46, 80, s, 't-ink t-b t-sm'); if (i < 5) o += P('M' + (x + 92) + ' 75H' + (x + 99), 'w'); });
    o += T(300, 26, ['Front end: fetch guided by the branch predictor', 'Middle: decode and issue several instructions per cycle', 'Back end: forwarding and a cache keep the pipeline fed'][k], 't-vio t-b t-sm');
    return S(600, 120, o, 'Mini processor');
  }

  L.module({
    n: 10,
    lead: 'Put Level 13 together: design a small processor by choosing its datapath, hazard handling, branch predictor, issue width and cache, run real instruction sequences through it, and analyse the report – CPI, IPC, prediction accuracy, cache hit rate, stalls and cycles.',
    tags: ['project', 'datapath', 'pipeline', 'branch predictor', 'issue width', 'cache', 'IPC / CPI', 'performance report'],
    sections: [
      {
        id: 'st-arch', type: 'steps', title: 'Animation: the processor you will build', nav: 'Architecture',
        frames: [0, 1, 2].map(function (k) { return { t: ['Fetch follows the branch predictor\'s guess.', 'Decode and issue – one or two instructions per cycle.', 'Execute with forwarding, access memory through the cache, write back.'][k], svg: archFrame(k) }; })
      },
      {
        id: 'c-how', type: 'concept', title: 'How the report is produced', nav: 'Simulation model',
        html: '<p>Each program is run as real traces: the <b>branch predictor</b> is simulated branch by branch on the program\'s actual taken/not-taken sequence, and the <b>cache</b> is simulated address by address (64-byte blocks, LRU). Cycles = issue cycles (instructions ÷ achievable ILP) + pipeline fill + data-hazard stalls + 2 cycles per misprediction + 20 cycles per cache miss.</p>' +
          '<div class="l7-eq">Execution time = cycles × clock period      CPI = cycles / instructions      IPC = 1 / CPI</div>'
      },
      { id: 'w-cpu', type: 'widget', title: '🏆 Build a mini processor', nav: 'Project', intro: 'Configure all six parts, run the program and reach the goal. Then compare the three programs.', build: cpuLab },
      {
        id: 'rv-10', type: 'reveal', title: 'Click to reveal: project insights', nav: 'Lessons',
        items: [
          { q: 'Why does the matrix walk need the 1 KB cache?', a: 'Walking down columns touches 8 different 64-byte blocks over and over (512 B of reused data). A 256 B cache cannot hold them, so almost every access misses – a capacity problem.' },
          { q: 'Why does gshare win on the correlated-branch program?', a: 'Each branch\'s outcome depends on the previous branch; global history captures that, a per-branch counter cannot.' },
          { q: 'Why does a single-cycle processor have CPI = 1 but run slowly?', a: 'Its clock must fit the slowest instruction (5 ns here), so every instruction pays that long period.' },
          { q: 'Why does 2-wide issue not halve the cycles?', a: 'Dependencies limit how many instructions can really issue together (ILP ≈ 1.6 here).' }
        ]
      },
      {
        id: 'dd-10', type: 'drag', title: 'Drag & drop: which choice fixes it?', nav: 'Fix it',
        bins: ['Forwarding', 'Better predictor', 'Larger cache', 'Pipelining'],
        items: [['many stalls on ALU dependencies', 0], ['branch accuracy 60 % on correlated branches', 1], ['hit rate collapses when the working set exceeds the cache', 2], ['CPI 1 but a 5 ns clock', 3]]
      },
      {
        id: 'mcq10', type: 'mcq', title: 'Integrated MCQs', nav: 'MCQ',
        items: [
          { q: 'IPC 0.8 means CPI =', o: ['1.25', '0.8', '1.8', '0.2'], a: 0, w: '' },
          { q: 'Forwarding mainly removes…', o: ['data-hazard stalls', 'cache misses', 'mispredictions', 'structural hazards on memory'], a: 0, w: '' },
          { q: 'A 2-way set-associative cache reduces…', o: ['conflict misses', 'compulsory misses', 'branch penalties', 'IC'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen10', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Your processor reaches 95 % branch accuracy and 98 % hit rate but is only 2× faster than single-cycle.', q: 'What is the most likely remaining bottleneck?', o: [{ t: 'Data-hazard stalls – enable forwarding', ok: true, w: 'Stalls dominate once predictor and cache are good.' }, { t: 'The cache is too large', ok: false, w: 'Hit rate is already high.' }, { t: 'Too few branches', ok: false, w: 'Not a bottleneck.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'CPU time =', o: ['IC × CPI × clock period', 'IC + CPI', 'CPI / frequency', 'IPC × IC'], a: 0, w: '' },
      { d: 'Easy', q: 'A branch predictor improves…', o: ['control-hazard penalties', 'cache size', 'clock period', 'register count'], a: 0, w: '' },
      { d: 'Easy', q: 'Cache hit rate measures…', o: ['the fraction of accesses found in the cache', 'branch accuracy', 'IPC', 'pipeline depth'], a: 0, w: '' },
      { d: 'Medium', q: '1000 instructions in 1250 cycles: IPC =', o: ['0.8', '1.25', '1.0', '0.5'], a: 0, w: '' },
      { d: 'Medium', q: '200 branches, 20 mispredictions: accuracy =', o: ['90 %', '80 %', '10 %', '95 %'], a: 0, w: '' },
      { d: 'Medium', q: 'Which helps correlated branches most?', o: ['gshare (global history)', 'always taken', '1-bit per branch', 'larger cache'], a: 0, w: '' },
      { d: 'Medium', q: 'A pipelined processor shortens…', o: ['the clock period', 'the instruction count', 'cache misses', 'branch count'], a: 0, w: '' },
      { d: 'Hard', q: '20 misses × 20-cycle penalty adds…', o: ['400 cycles', '40 cycles', '20 cycles', '2000 cycles'], a: 0, w: '' },
      { d: 'Hard', q: 'Why is 2-wide issue speedup below 2×?', o: ['dependencies limit ILP', 'the clock doubles', 'caches shrink', 'branches disappear'], a: 0, w: '' },
      { d: 'Hard', q: 'Re-used data larger than the whole cache mainly causes…', o: ['capacity misses', 'compulsory misses only', 'no misses', 'branch mispredictions'], a: 0, w: '' }
    ]
  });
})();
