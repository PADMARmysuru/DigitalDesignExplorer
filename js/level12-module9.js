/* Level 12 · Module 9 – Post-Silicon Validation & Yield */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  function rng(seed) { var a = seed; return function () { a = (a * 1103515245 + 12345) & 0x7fffffff; return a / 0x7fffffff; }; }
  var MAPS = [
    { n: 'Wafer W07', kind: 1, gen: function (x, y, r, u) { return r > 0.86 ? u < 0.75 : u < 0.06; } },
    { n: 'Wafer W12', kind: 0, gen: function (x, y, r, u) { return u < 0.14; } },
    { n: 'Wafer W19', kind: 2, gen: function (x, y, r, u) { var d = Math.hypot(x - 0.3, y + 0.25); return d < 0.28 ? u < 0.85 : u < 0.05; } }
  ];
  var KINDS = [['Random defects (particles) – spread uniformly', 'Improve clean-room / process defect density; yield follows the Poisson model.'], ['Systematic edge-ring failure – a process step at the wafer edge (e.g. etch/CMP uniformity)', 'Process engineers fix the edge step; the design is fine.'], ['Clustered failures in one region – local contamination or equipment problem', 'Trace the tool / wafer location; inspect the region; often a single equipment issue.']];

  /* ---------- Widget: yield analysis dashboard ---------- */
  function yieldLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Yield analysis dashboard · wafer maps from production test</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var cur = 0, ok = {}, A = 1.0, D = 0.6, yOK = false, done = false;
    var tabs = L.h('div', 'l7-row'); body.appendChild(tabs);
    var map = L.h('div', 'l7-svgbox'); body.appendChild(map);
    var ch = L.h('div', 'l7-choice'); ch.style.gridTemplateColumns = '1fr'; body.appendChild(ch);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    body.appendChild(L.h('h4', '', 'Yield model and yield learning'));
    var g = L.h('div', 'l7-grid2'); body.appendChild(g);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g.appendChild(c1); g.appendChild(c2);
    L.slider(c1, 'Die area A', 0.2, 2.0, 0.1, A, function (v) { return v.toFixed(1) + ' cm²'; }, function (v) { A = v; calc(); });
    L.slider(c2, 'Defect density D₀', 0.05, 1.0, 0.01, D, function (v) { return v.toFixed(2) + ' /cm²'; }, function (v) { D = v; calc(); });
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function drawMap() {
      tabs.innerHTML = '';
      MAPS.forEach(function (m, i) { tabs.appendChild(L.btn((ok[i] ? '✓ ' : '') + m.n, i === cur ? 'is-on' : '', function () { cur = i; drawMap(); })); });
      var m = MAPS[cur], r = rng(7 + cur * 13), o = '<circle cx="150" cy="150" r="140" fill="#f5f5f7" stroke="#8e8e93"/>', fail = 0, tot = 0;
      for (var gy = -1; gy <= 1.0001; gy += 0.1) for (var gx = -1; gx <= 1.0001; gx += 0.1) {
        var rr = Math.hypot(gx + 0.05, gy + 0.05); if (rr > 0.95) continue;
        var f = m.gen(gx, gy, rr, r()); tot++; if (f) fail++;
        o += '<rect x="' + (150 + gx * 140) + '" y="' + (150 + gy * 140) + '" width="12.5" height="12.5" fill="' + (f ? '#ff3b30' : '#34c759') + '" opacity=".85"/>';
      }
      o += T(330, 140, m.n, 't-ink t-b', 'start') + T(330, 164, 'yield ' + Math.round(100 * (tot - fail) / tot) + ' %', 't-dim t-sm', 'start') + T(330, 184, 'red = failing die', 't-bad t-sm', 'start');
      map.innerHTML = S(460, 300, o, 'Wafer map');
      ch.innerHTML = '';
      KINDS.forEach(function (k, i) {
        var b = L.h('button', ok[cur] && i === m.kind ? 'is-right' : '', k[0]); b.type = 'button';
        b.addEventListener('click', function () { if (i === m.kind) { ok[cur] = 1; L.fb(fb, 'ok', '✓ ' + k[1]); drawMap(); check(); } else { b.classList.add('is-wrong'); L.fb(fb, 'bad', '✗ Look at where the red dies are: everywhere, at the edge, or in one area?'); } });
        ch.appendChild(b);
      });
    }
    function calc() {
      var Y = Math.exp(-A * D), dies = Math.floor(706.9 / A * 0.9), good = Math.floor(dies * Y);
      out.innerHTML = '<span class="k">Poisson yield</span> Y = e<sup>−A·D₀</sup> = <span class="' + (Y >= 0.8 ? 'v' : 'c') + '">' + (100 * Y).toFixed(1) + ' %</span> · <span class="k">dies per 300 mm wafer</span> ≈ ' + dies + ' · <span class="k">good dies</span> ≈ ' + good;
      yOK = Y >= 0.8 && A >= 1.0; check();
    }
    function check() {
      var n = Object.keys(ok).length;
      verdict.className = 'l7-verdict ' + (n === 3 && yOK ? 'ok' : 'warn');
      verdict.innerHTML = 'Wafer maps classified: ' + n + ' / 3 · yield target ' + (yOK ? '✅' : '○') + '<small>Yield-learning task: keep the die at ≥ 1.0 cm² and find the defect density the fab must reach for ≥ 80 % yield. ' + (yOK ? 'D₀ ≤ 0.22 /cm² – that is what years of yield learning achieve.' : '') + '</small>';
      if (n === 3 && yOK && !done) { done = true; api.done(); }
    }
    drawMap(); calc();
  }

  function psFrame(k) {
    var st = ['First silicon', 'Bring-up', 'Validation', 'Diagnosis', 'Yield learning', 'Production'], o = '';
    st.forEach(function (s, i) { var x = 6 + i * 99; o += R(x, 50, 92, 46, i === k ? 'box-on' : i < k ? 'box-ok' : 'box', 8) + T(x + 46, 78, s, 't-ink t-b t-sm'); if (i < 5) o += P('M' + (x + 92) + ' 73H' + (x + 99), 'w'); });
    o += T(300, 26, ['Wafers return from the fab', 'Power, clocks, reset, JTAG – does the chip come alive?', 'Run real workloads on boards: does it work in the system?', 'Failing dies → test logs → diagnosis → physical failure analysis', 'Fix systematic issues; defect density falls; yield rises', 'High-volume test with optimised patterns'][k], 't-vio t-b t-sm');
    return S(600, 120, o, 'Post-silicon flow');
  }

  L.module({
    n: 9,
    lead: 'When first silicon arrives, a new kind of work begins: bringing the chip up, validating it in real systems, diagnosing failures down to a defect location, and learning from millions of test results to raise yield. This is where DFT pays for itself.',
    tags: ['silicon bring-up', 'post-silicon validation', 'failure diagnosis', 'defect classification', 'yield', 'yield learning', 'test-data analysis', 'production test'],
    sections: [
      {
        id: 'st-ps', type: 'steps', title: 'Animation: from first silicon to production', nav: 'Post-silicon flow',
        frames: [0, 1, 2, 3, 4, 5].map(function (k) { return { t: ['First wafers arrive.', '<b>Bring-up</b>: power, clocks, reset and JTAG access first – DFT features are often the first things to work.', '<b>Post-silicon validation</b>: real software and workloads find bugs pre-silicon verification missed.', '<b>Diagnosis</b> turns tester failures into suspect locations (Module 4); failure analysis confirms the physical defect.', '<b>Yield learning</b>: systematic problems are fixed, random defect density falls.', '<b>Production test</b>: optimised, fast test programs for millions of chips.'][k], svg: psFrame(k) }; })
      },
      {
        id: 'c-yield', type: 'concept', title: 'Yield and defects', nav: 'Yield',
        html: '<div class="l7-eq">Yield Y = good dies / total dies      Poisson model: Y = e^(−A·D₀)      DPPM ≈ (1 − Y^(1 − coverage)) × 10⁶</div>' +
          '<div class="l7-grid3"><div class="l7-box sig"><h4>Random defects</h4><p>particles – reduced by cleaner processes</p></div><div class="l7-box cu"><h4>Systematic defects</h4><p>design–process interactions, edge effects, litho hotspots – fixed once found</p></div><div class="l7-box vio"><h4>Parametric failures</h4><p>chips that work but too slowly or with too much leakage</p></div></div>'
      },
      { id: 'w-yield', type: 'widget', title: 'Yield analysis dashboard', nav: 'Yield dashboard', intro: 'Classify the three wafer maps, then use the yield model to find the defect density needed for 80 % yield on a 1 cm² die.', build: yieldLab },
      {
        id: 'c-data', type: 'concept', title: 'Test-data analysis and production challenges', nav: 'Data & production',
        html: '<div class="l7-grid2"><div class="l7-box"><h4>Test-data analysis</h4><ul><li>wafer maps and bin maps reveal spatial patterns</li><li>volume diagnosis of thousands of failing dies finds systematic defects statistically</li><li>adaptive test: skip or add tests based on results</li></ul></div><div class="l7-box"><h4>Production challenges</h4><ul><li>test cost per die vs quality (DPPM)</li><li>tester time and memory</li><li>over-kill vs escapes</li><li>multi-site testing, temperature corners</li></ul></div></div>'
      },
      {
        id: 'rv-9', type: 'reveal', title: 'Click to reveal: post-silicon insights', nav: 'Reveal',
        items: [
          { q: 'Why does a bigger die have lower yield?', a: 'It is more likely to contain at least one defect: Y = e^(−A·D₀) falls with area.' },
          { q: 'What is DPPM?', a: 'Defective parts per million shipped – escapes that the test missed. Automotive targets are in single digits.' },
          { q: 'What does an edge-ring pattern tell you?', a: 'A process step behaves differently at the wafer edge – a fab issue, not a design bug.' },
          { q: 'Why is DFT critical during bring-up?', a: 'JTAG, scan dumps and MBIST give visibility into a chip whose functional paths may not work yet.' }
        ]
      },
      {
        id: 'dd-9', type: 'drag', title: 'Drag & drop: classify the observation', nav: 'Drag & drop',
        bins: ['Random defect', 'Systematic defect', 'Design bug'],
        items: [['isolated failing dies spread over the wafer', 0], ['particle found by failure analysis', 0], ['same via fails on every wafer at the edge', 1], ['failures cluster at a lithography hotspot', 1], ['every die fails the same software test', 2], ['wrong result in one instruction on all chips', 2]]
      },
      {
        id: 'calc9', type: 'calc', title: 'Yield calculations', nav: 'Calculate',
        items: [
          { q: 'A = 1.0 cm², D₀ = 0.5 /cm². Poisson yield (%, one decimal)?', a: 60.7, tol: 0.01, h: 'e^(−0.5).', s: '<b>60.7 %</b>.' },
          { q: 'A = 0.5 cm², D₀ = 0.5 /cm². Yield (%, one decimal)?', a: 77.9, tol: 0.01, h: 'e^(−0.25).', s: '<b>77.9 %</b>.' },
          { q: '600 dies per wafer at 80 % yield: good dies?', a: 480, h: '600 × 0.8.', s: '<b>480</b>.' }
        ]
      },
      {
        id: 'mcq9', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Silicon bring-up starts with…', o: ['power, clocks, reset and JTAG access', 'full software', 'GDSII', 'RTL'], a: 0, w: '' },
          { q: 'Poisson yield depends on…', o: ['die area and defect density', 'clock frequency', 'pin count', 'test time'], a: 0, w: '' },
          { q: 'Volume diagnosis helps find…', o: ['systematic defects', 'RTL bugs', 'timing constraints', 'scan chains'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen9', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Diagnosis of 2,000 failing dies points to the same metal-3 via in a standard cell layout pattern.', q: 'What kind of problem is it, and what is done?', o: [{ t: 'A systematic defect – fix the layout pattern / process and add targeted tests', ok: true, w: 'Same location on many dies = systematic.' }, { t: 'Random particles – clean the fab', ok: false, w: 'Random defects do not repeat in one spot.' }, { t: 'A verification bug', ok: false, w: 'Most dies work.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Yield is…', o: ['good dies / total dies', 'test time', 'fault coverage', 'clock speed'], a: 0, w: '' },
      { d: 'Easy', q: 'Post-silicon validation checks…', o: ['the chip in real systems', 'only RTL', 'the layout', 'the SDC'], a: 0, w: '' },
      { d: 'Easy', q: 'A wafer map shows…', o: ['pass/fail per die location', 'timing paths', 'netlists', 'power'], a: 0, w: '' },
      { d: 'Medium', q: 'Larger die area makes Poisson yield…', o: ['lower', 'higher', 'unchanged', 'zero'], a: 0, w: '' },
      { d: 'Medium', q: 'An edge-ring failure pattern suggests…', o: ['a systematic process issue', 'random particles', 'a design bug', 'a test bug'], a: 0, w: '' },
      { d: 'Medium', q: 'DPPM measures…', o: ['defective parts shipped per million', 'patterns per minute', 'dies per wafer', 'defects per mm'], a: 0, w: '' },
      { d: 'Medium', q: 'A = 2 cm², D₀ = 0.1: Y ≈', o: ['82 %', '90 %', '60 %', '98 %'], a: 0, w: 'e^(−0.2).' },
      { d: 'Hard', q: 'Yield learning mainly reduces…', o: ['defect density over time', 'die area', 'test coverage', 'pin count'], a: 0, w: '' },
      { d: 'Hard', q: 'Why does higher test coverage lower DPPM?', o: ['fewer defective dies escape the test', 'it raises yield', 'it shrinks dies', 'it does not'], a: 0, w: '' },
      { d: 'Hard', q: 'Volume diagnosis is powerful because…', o: ['patterns across many dies reveal systematic causes', 'it fixes defects', 'it replaces testing', 'it needs no data'], a: 0, w: '' }
    ]
  });
})();
