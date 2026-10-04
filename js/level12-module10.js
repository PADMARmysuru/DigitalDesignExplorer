/* Level 12 · Module 10 – Advanced DFT & Silicon Test Project */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  function evalPlan(c) {
    var sa = c.ratio >= 200 ? 0.985 : 0.992;
    var tdf = c.at === 'none' ? 0 : c.at === 'los' ? 0.95 : 0.94;
    var mm = c.march === 'mats' ? 0.30 : 0.02;
    var dppm = 600 * (1 - sa) + 500 * (1 - tdf) + 100 * mm + (c.ca ? 0 : 20);
    var pats = 3000 + (c.at !== 'none' ? 4000 : 0) + (c.ca ? 1500 : 0);
    var shift = Math.ceil(100000 / (8 * c.ratio)) + 3;
    var t = pats * shift / 25e6 * 1000 + (c.march === 'mats' ? 15 : 30) + (c.lbist ? 40 : 0);
    var area = (c.ratio > 1 ? 0.6 : 0) + 1.5 + (c.lbist ? 2.5 : 0) + (c.ijtag ? 0.3 : 0) + (c.at !== 'none' ? 0.2 : 0) + (c.at === 'los' ? 0.8 : 0);
    return { sa: sa, tdf: tdf, dppm: dppm, t: t, area: area, pats: pats };
  }

  /* ---------- Widget: build a complete test solution ---------- */
  function projLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Test solution builder · automotive SoC: 100k flip-flops, 6 SRAMs, 8 test channels</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Customer requirements</span> ≤ 50 DPPM · production test ≤ 300 ms · DFT area ≤ 7 % · in-field self-test of logic · instruments accessible via JTAG · failing dies diagnosable'));
    var c = { ratio: 10, at: 'none', ca: false, march: 'mats', lbist: false, ijtag: false, diag: false }, done = false;
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    var r1 = L.h('div', 'l7-row'); c1.appendChild(r1);
    L.select(r1, 'Scan compression', [['1', 'none'], ['10', '10×'], ['50', '50×'], ['100', '100×'], ['200', '200×']], '10', function (v) { c.ratio = +v; draw(); });
    var r2 = L.h('div', 'l7-row'); c1.appendChild(r2);
    L.select(r2, 'At-speed test', [['none', 'none (stuck-at only)'], ['loc', 'Transition, LOC + OCC'], ['los', 'Transition, LOS + OCC (fast SE)']], 'none', function (v) { c.at = v; draw(); });
    var r3 = L.h('div', 'l7-row'); c1.appendChild(r3);
    L.select(r3, 'MBIST algorithm', [['mats', 'MATS+ (5n)'], ['marchc', 'March C− (10n)']], 'mats', function (v) { c.march = v; draw(); });
    var tg = {};
    [['ca', 'Cell-aware ATPG patterns'], ['lbist', 'Logic BIST (in-field)'], ['ijtag', 'IJTAG instrument network'], ['diag', 'Diagnosis-ready pattern logging']].forEach(function (x) { tg[x[0]] = L.btn(x[1], '', function () { c[x[0]] = !c[x[0]]; draw(); }); tg[x[0]].style.margin = '4px 0'; tg[x[0]].style.display = 'block'; c2.appendChild(tg[x[0]]); });
    var tbl = L.h('div', 'l7-table-wrap'); body.appendChild(tbl);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function draw() {
      Object.keys(tg).forEach(function (k) { tg[k].classList.toggle('is-on', c[k]); tg[k].innerHTML = (c[k] ? '☑ ' : '☐ ') + tg[k].innerHTML.replace(/^[☑☐] /, ''); });
      var m = evalPlan(c);
      var rows = [
        ['Escapes (DPPM)', m.dppm.toFixed(0), m.dppm <= 50, '≤ 50'],
        ['Production test time', m.t.toFixed(0) + ' ms', m.t <= 300, '≤ 300 ms'],
        ['DFT area', m.area.toFixed(1) + ' %', m.area <= 7, '≤ 7 %'],
        ['Stuck-at / transition coverage', (100 * m.sa).toFixed(1) + ' % / ' + (100 * m.tdf).toFixed(0) + ' %', true, 'info'],
        ['In-field self-test', c.lbist ? 'LBIST' : 'none', c.lbist, 'required'],
        ['Instrument access', c.ijtag ? 'IJTAG' : 'none', c.ijtag, 'required'],
        ['Diagnosis', c.diag ? 'enabled' : 'none', c.diag, 'required']
      ];
      tbl.innerHTML = '<table class="l7-cmp"><tr><th>Metric</th><th>Your solution</th><th>Target</th></tr>' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td class="' + (r[3] === 'info' ? '' : r[2] ? 'better' : 'worse') + '">' + r[1] + '</td><td>' + r[3] + '</td></tr>'; }).join('') + '</table>';
      var fails = rows.filter(function (r) { return r[3] !== 'info' && !r[2]; });
      var hints = [];
      if (m.dppm > 50) hints.push(c.at === 'none' ? 'no delay testing: transition defects escape' : c.march === 'mats' ? 'MATS+ misses memory coupling faults' : !c.ca ? 'cell-internal defects escape without cell-aware patterns' : 'coverage still too low');
      if (m.t > 300) hints.push('too slow – increase compression');
      if (m.area > 7) hints.push('too much DFT area – LOS needs an at-speed scan-enable tree; LOC is cheaper');
      verdict.className = 'l7-verdict ' + (fails.length ? 'bad' : 'ok');
      verdict.innerHTML = fails.length ? '❌ ' + fails.length + ' requirement' + (fails.length > 1 ? 's' : '') + ' not met<small>' + (hints.join(' · ') || 'Enable the remaining required features.') + '</small>' : '🏆 Test solution accepted: ' + m.dppm.toFixed(0) + ' DPPM, ' + m.t.toFixed(0) + ' ms, ' + m.area.toFixed(1) + ' % area<small>Compression for cost, transition + cell-aware patterns and March C− for quality, LBIST for the field, IJTAG for access and diagnosis for yield learning – a complete industrial DFT strategy.</small>';
      if (!fails.length && !done) { done = true; api.done(); }
    }
    draw();
  }

  function stratFrame(k) {
    var o = '', layers = [['Quality', 'fault models: stuck-at, transition, cell-aware, memory'], ['Cost', 'compression, test time, tester memory'], ['Lifetime', 'LBIST / MBIST in the field, IJTAG access'], ['Learning', 'diagnosis and yield analysis']];
    layers.forEach(function (l, i) { var y = 14 + i * 40; o += R(40, y, 520, 34, i === k ? 'box-on' : 'box', 8) + T(56, y + 22, l[0] + ' – ' + l[1], i === k ? 't-ink t-b t-sm' : 't-dim t-sm', 'start'); });
    return S(600, 180, o, 'Test strategy');
  }

  L.module({
    n: 10,
    lead: 'Combine everything in Level 12 into one test solution for a demanding automotive chip: scan compression, ATPG fault models, at-speed test, memory test, logic BIST, IJTAG access and diagnosis – balanced against test time, area and quality targets.',
    tags: ['project', 'scan compression', 'ATPG', 'fault coverage', 'MBIST', 'LBIST', 'JTAG / IJTAG', 'diagnosis', 'yield'],
    sections: [
      {
        id: 'st-strat', type: 'steps', title: 'Animation: the four goals of a test strategy', nav: 'Test strategy',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['<b>Quality</b>: detect the defects that occur – choose fault models and coverage targets.', '<b>Cost</b>: keep tester time and data small – compression and compaction.', '<b>Lifetime</b>: self-test in the field for safety-critical products.', '<b>Learning</b>: diagnosis data feeds yield improvement.'][k], svg: stratFrame(k) }; })
      },
      { id: 'w-proj', type: 'widget', title: 'Advanced DFT & silicon test project', nav: 'Project', intro: 'Configure the test solution so every customer requirement is met.', build: projLab },
      {
        id: 'c-summary', type: 'concept', title: 'How the pieces fit together', nav: 'Summary',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Requirement</th><th>Level 12 tool</th><th>Module</th></tr><tr><td>Low test cost</td><td>scan compression, compaction</td><td>2, 3</td></tr><tr><td>Low DPPM</td><td>transition, cell-aware, March C−</td><td>4, 5, 8</td></tr><tr><td>In-field test</td><td>LBIST, MBIST</td><td>5, 6</td></tr><tr><td>Access</td><td>IJTAG, 1500 wrappers</td><td>1, 7</td></tr><tr><td>Yield improvement</td><td>diagnosis, yield analysis</td><td>4, 9</td></tr></table></div>'
      },
      {
        id: 'rv-10', type: 'reveal', title: 'Click to reveal: project lessons', nav: 'Lessons',
        items: [
          { q: 'Why was stuck-at testing alone not enough?', a: 'Modern defects are often delays and cell-internal faults – they escape stuck-at patterns and raise DPPM.' },
          { q: 'Why did compression decide the test time?', a: 'Without it, 100k flip-flops on 8 channels need 12,500 shift cycles per pattern.' },
          { q: 'Why might LOS be rejected despite higher coverage?', a: 'Its at-speed scan-enable network costs area and timing effort.' },
          { q: 'Why is diagnosis part of the test solution?', a: 'Failing dies are the data source for yield learning; without logging, nothing is learned.' }
        ]
      },
      {
        id: 'dd-10', type: 'drag', title: 'Drag & drop: which goal does it serve?', nav: 'Drag & drop',
        bins: ['Quality (low DPPM)', 'Cost (test time)', 'Lifetime / access'],
        items: [['cell-aware patterns', 0], ['March C− instead of MATS+', 0], ['50× compression', 1], ['pattern compaction', 1], ['logic BIST', 2], ['IJTAG network', 2]]
      },
      {
        id: 'mcq10', type: 'mcq', title: 'Integrated MCQs', nav: 'MCQ',
        items: [
          { q: 'Transition patterns mainly reduce…', o: ['escapes of delay defects', 'test time', 'area', 'pins'], a: 0, w: '' },
          { q: 'In-field logic self-test is provided by…', o: ['LBIST', 'EDT', 'boundary scan only', 'ATPG on the tester'], a: 0, w: '' },
          { q: 'Diagnosis-ready logging supports…', o: ['yield learning', 'lower area', 'faster shift', 'memory repair only'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen10', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A customer accepts 20 DPPM but test time must halve; your plan uses 10× compression.', q: 'Best first step?', o: [{ t: 'Raise compression (e.g. 50×) while watching coverage', ok: true, w: 'Biggest time lever with little quality loss.' }, { t: 'Drop transition patterns', ok: false, w: 'DPPM would rise.' }, { t: 'Remove MBIST', ok: false, w: 'Memory escapes.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'A test solution balances…', o: ['quality, cost and lifetime needs', 'only area', 'only coverage', 'only pins'], a: 0, w: '' },
      { d: 'Easy', q: 'Automotive chips often require…', o: ['in-field self-test', 'no testing', 'only visual inspection', 'no DFT'], a: 0, w: '' },
      { d: 'Easy', q: 'Compression mainly lowers…', o: ['test time and data', 'DPPM', 'area', 'yield'], a: 0, w: '' },
      { d: 'Medium', q: 'March C− instead of MATS+ improves…', o: ['memory coupling-fault coverage', 'test time', 'area', 'scan shift'], a: 0, w: '' },
      { d: 'Medium', q: 'Cell-aware patterns target…', o: ['defects inside standard cells', 'package faults', 'clock skew', 'memories'], a: 0, w: '' },
      { d: 'Medium', q: 'LOS compared with LOC costs more…', o: ['scan-enable design effort/area', 'patterns', 'coverage', 'MBIST'], a: 0, w: '' },
      { d: 'Medium', q: 'Which block gives JTAG access to MBIST and sensors?', o: ['IJTAG network', 'EDT', 'OCC', 'MISR'], a: 0, w: '' },
      { d: 'Hard', q: '100k flops, 8 channels, 50× compression: shift cycles per pattern ≈', o: ['250', '12,500', '2,000', '50'], a: 0, w: '100,000 / 400.' },
      { d: 'Hard', q: 'Raising compression to 200× can…', o: ['reduce stuck-at coverage slightly', 'raise coverage', 'remove MBIST', 'add pins'], a: 0, w: '' },
      { d: 'Hard', q: 'Without at-speed tests, the main escapes are…', o: ['delay defects', 'stuck-at faults', 'memory faults', 'board shorts'], a: 0, w: '' }
    ]
  });
})();
