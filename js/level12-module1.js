/* Level 12 · Module 1 – Advanced DFT Architecture */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var PARTS = [
    { k: 'wrap', n: 'IEEE 1500 wrappers on the 3 cores', a: 2.4, why: 'Each core can be tested in isolation with the patterns delivered by its IP vendor (core-based, hierarchical test).' },
    { k: 'edt', n: 'Scan compression (EDT) per core', a: 0.5, why: 'Hundreds of short internal chains behind a few tester channels – test time and data shrink by 10–100×.' },
    { k: 'mbist', n: 'MBIST controller for the 4 SRAMs', a: 1.5, why: 'Memories are too dense for scan ATPG; on-chip March tests run at speed.' },
    { k: 'ijtag', n: 'JTAG TAP + IJTAG network', a: 0.3, why: 'A standard path to start MBIST, read results and configure wrappers and instruments.' },
    { k: 'occ', n: 'On-chip clock controller (OCC)', a: 0.2, why: 'Produces exact at-speed launch/capture pulses from the PLL for delay testing.' },
    { k: 'lbist', n: 'Logic BIST for in-field self-test', a: 2.5, why: 'Useful for automotive in-field test, but costly in area – not required by this specification.' }
  ];

  /* ---------- Widget: DFT architecture builder ---------- */
  function archLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>DFT architecture builder · SoC: CPU, DSP and GPU cores, 4 SRAMs, PLL</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    body.appendChild(L.h('div', 'l7-readout', '<span class="k">Test specification</span> ≤ 16 test pins · ≤ 100 ms logic test time · memories tested · at-speed delay test · instruments controllable through JTAG · cores tested with vendor patterns · DFT area ≤ 6 %'));
    var on = {}, pins = 16, done = false, btn = {};
    var g = L.h('div', 'l7-choice'); body.appendChild(g);
    PARTS.forEach(function (p) { var b = L.h('button', '', ''); b.type = 'button'; b.addEventListener('click', function () { on[p.k] = !on[p.k]; draw(p); }); btn[p.k] = b; g.appendChild(b); });
    L.slider(body, 'Test pins (scan channels × 2)', 4, 32, 2, pins, null, function (v) { pins = v; draw(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    var why = L.h('div', 'l7-fb'); body.appendChild(why);
    function draw(last) {
      PARTS.forEach(function (p) { btn[p.k].className = on[p.k] ? 'is-pick' : ''; btn[p.k].innerHTML = (on[p.k] ? '☑ ' : '☐ ') + p.n + ' <span style="opacity:.6">(+' + p.a + ' %)</span>'; });
      var flops = [120000, 60000, 40000], chains = pins / 2 * (on.edt ? 40 : 1), pat = 2000, f = 50e6;
      var t = flops.reduce(function (s, fl) { return s + pat * (Math.ceil(fl / chains) + 4) / f * 1000; }, 0);
      var area = PARTS.reduce(function (s, p) { return s + (on[p.k] ? p.a : 0); }, 0);
      var o = R(10, 10, 580, 210, 'box', 12);
      ['CPU', 'DSP', 'GPU'].forEach(function (c, i) { var x = 30 + i * 140; o += R(x, 30, 120, 80, 'box-on', 8) + T(x + 60, 75, c, 't-ink t-b'); if (on.wrap) o += '<rect x="' + (x - 5) + '" y="25" width="130" height="90" rx="10" fill="none" stroke="#ff9500" stroke-width="3" stroke-dasharray="6 3"/>'; if (on.edt) o += R(x + 35, 90, 50, 16, 'box-vio', 4) + T(x + 60, 102, 'EDT', 't-ink t-sm'); });
      for (var m = 0; m < 4; m++) o += R(460 + (m % 2) * 60, 30 + Math.floor(m / 2) * 45, 50, 38, on.mbist ? 'box-ok' : 'box', 6) + T(485 + (m % 2) * 60, 54 + Math.floor(m / 2) * 45, 'RAM', 't-ink t-sm');
      if (on.mbist) o += R(460, 122, 110, 22, 'box-ok', 6) + T(515, 137, 'MBIST ctrl', 't-ink t-sm');
      if (on.ijtag) o += R(30, 160, 120, 40, 'box-cu', 8) + T(90, 185, 'TAP + IJTAG', 't-ink t-b t-sm') + P('M150 180H560', 'w-cu');
      if (on.occ) o += R(180, 160, 90, 40, 'box-vio', 8) + T(225, 185, 'PLL + OCC', 't-ink t-b t-sm');
      if (on.lbist) o += R(300, 160, 100, 40, 'box', 8) + T(350, 185, 'LBIST', 't-ink t-b t-sm');
      o += T(300, 236, pins + ' test pins → ' + chains + ' internal chains per core', 't-dim t-sm');
      pic.innerHTML = S(600, 246, o, 'DFT architecture');
      out.innerHTML = '<span class="k">Logic test time</span> <span class="' + (t <= 100 ? 'v' : 'c') + '">' + (t >= 1000 ? (t / 1000).toFixed(2) + ' s' : t.toFixed(1) + ' ms') + '</span> · <span class="k">DFT area</span> <span class="' + (area <= 6 ? 'v' : 'c') + '">' + area.toFixed(1) + ' %</span> · <span class="k">test pins</span> <span class="' + (pins <= 16 ? 'v' : 'c') + '">' + pins + '</span>';
      var miss = [];
      if (pins > 16) miss.push('more than 16 test pins');
      if (t > 100) miss.push('test time ' + (t >= 1000 ? (t / 1000).toFixed(1) + ' s' : Math.round(t) + ' ms') + ' > 100 ms');
      if (!on.mbist) miss.push('memories not tested');
      if (!on.occ) miss.push('no at-speed clocking');
      if (!on.ijtag) miss.push('no standard access to instruments');
      if (!on.wrap) miss.push('cores cannot reuse vendor patterns');
      if (area > 6) miss.push('area ' + area.toFixed(1) + ' % > 6 %');
      verdict.className = 'l7-verdict ' + (miss.length ? 'bad' : 'ok');
      verdict.innerHTML = miss.length ? '❌ Specification not met<small>' + miss.join(' · ') + '</small>' : '✅ DFT architecture meets the specification<small>Wrapped cores with compression, MBIST, IJTAG access and an OCC – at ' + area.toFixed(1) + ' % area. LBIST would add in-field test but was not required.</small>';
      if (!miss.length && !done) { done = true; api.done(); }
      if (last) L.fb(why, 'info', '<b>' + last.n + ':</b> ' + last.why);
    }
    draw();
  }

  function hierFrame(k) {
    var o = R(20, 20, 560, 150, 'box', 12) + T(40, 40, 'SoC', 't-dim t-b t-sm', 'start');
    ['Core A', 'Core B', 'Core C'].forEach(function (c, i) { var x = 50 + i * 170; o += R(x, 55, 140, 70, 'box-on', 8) + T(x + 70, 95, c, 't-ink t-b'); if (k >= 1) o += '<rect x="' + (x - 6) + '" y="49" width="152" height="82" rx="10" fill="none" stroke="#ff9500" stroke-width="3" stroke-dasharray="6 3"/>'; });
    if (k >= 2) o += P('M30 150H570', 'w-cu') + T(300, 164, 'TAM (test access mechanism)', 't-cu t-sm');
    if (k >= 3) o += '<rect x="50" y="55" width="140" height="70" rx="8" fill="rgba(52,199,89,.35)"/>' + T(120, 140, 'testing A alone', 't-ok t-b t-sm');
    o += T(300, 190, ['A flat SoC: one giant ATPG run for everything', 'Each core gets a test wrapper (IEEE 1500)', 'A test access mechanism carries patterns to any wrapper', 'Cores are tested one by one or in parallel with their own patterns'][k], 't-vio t-b t-sm');
    return S(600, 200, o, 'Hierarchical DFT');
  }

  L.module({
    n: 1,
    lead: 'Level 5 introduced scan, ATPG, BIST and boundary scan one by one. Real chips combine all of them into a DFT architecture: test modes, hierarchical and core-based test, access networks and clocking – planned together with the design.',
    tags: ['DFT architecture', 'test modes', 'test access', 'hierarchical DFT', 'core-based DFT', 'DFT planning', 'trade-offs'],
    sections: [
      {
        id: 'c-arch', type: 'concept', title: 'From DFT techniques to a DFT architecture', nav: 'Architecture',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Block</th><th>Purpose</th></tr><tr><td>Scan + compression</td><td>logic test with ATPG patterns (Modules 2–4)</td></tr><tr><td>MBIST (+ repair)</td><td>memory test (Module 5)</td></tr><tr><td>LBIST</td><td>pseudo-random logic self-test, in field (Module 6)</td></tr><tr><td>JTAG / IJTAG</td><td>standard control and access network (Module 7)</td></tr><tr><td>OCC</td><td>at-speed clock pulses for delay tests (Module 8)</td></tr><tr><td>Wrappers + TAM</td><td>hierarchical, core-based test</td></tr></table></div>' +
          '<p><b>Test modes</b> (functional, scan shift/capture, MBIST, LBIST, boundary scan…) are selected through the TAP so the same pins serve many purposes.</p>'
      },
      {
        id: 'st-hier', type: 'steps', title: 'Animation: hierarchical, core-based DFT', nav: 'Hierarchical DFT',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['Flat DFT on a large SoC makes ATPG huge and slow.', 'Wrappers isolate each core at its boundary.', 'A test access mechanism (TAM) connects tester channels to any core.', 'Each core is tested with its own (vendor) patterns – reusable and much faster to generate.'][k], svg: hierFrame(k) }; })
      },
      { id: 'w-arch', type: 'widget', title: 'DFT architecture builder', nav: 'Architecture builder', intro: 'Select DFT blocks and test pins until the architecture meets every line of the test specification.', build: archLab },
      {
        id: 'c-plan', type: 'concept', title: 'DFT planning and trade-offs', nav: 'Planning',
        html: '<div class="l7-grid3"><div class="l7-box sig"><h4>Quality</h4><p>fault coverage, defect models, DPPM targets</p></div><div class="l7-box cu"><h4>Cost</h4><p>test time on expensive testers, pins, test-data volume</p></div><div class="l7-box vio"><h4>Design impact</h4><p>area, timing on scan paths, power during test</p></div></div><p style="margin-top:12px">DFT is planned at architecture time: pins, clocks, memories and IP cores all affect what is possible later.</p>'
      },
      {
        id: 'rv-1', type: 'reveal', title: 'Click to reveal: DFT architecture insights', nav: 'Reveal',
        items: [
          { q: 'Why test cores separately?', a: 'Smaller ATPG problems, reuse of IP-vendor patterns, parallel testing and easier diagnosis.' },
          { q: 'Why is tester time so important?', a: 'Every millisecond on a production tester costs money for millions of chips.' },
          { q: 'What does an IEEE 1500 wrapper add?', a: 'Wrapper cells at the core boundary that can isolate the core, apply inputs and capture outputs during test.' },
          { q: 'Why not add every DFT feature?', a: 'Each costs area, power, design time and possibly timing; the specification decides what is needed.' }
        ]
      },
      {
        id: 'dd-1', type: 'drag', title: 'Drag & drop: which DFT block?', nav: 'Drag & drop',
        bins: ['Logic test', 'Memory test', 'Access & control'],
        items: [['Scan compression', 0], ['On-chip clock controller', 0], ['March algorithm engine', 1], ['Redundancy repair', 1], ['TAP controller', 2], ['IJTAG network', 2]]
      },
      {
        id: 'mcq1', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'Core-based DFT relies on…', o: ['wrappers and a test access mechanism', 'no scan', 'only boundary scan', 'only LBIST'], a: 0, w: '' },
          { q: 'Test modes are usually selected through…', o: ['the JTAG TAP', 'the clock tree', 'the power grid', 'the package'], a: 0, w: '' },
          { q: 'Scan compression mainly reduces…', o: ['test time and data volume', 'area to zero', 'clock skew', 'routing'], a: 0, w: '' }
        ]
      },
      {
        id: 'scen1', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A new SoC integrates three purchased CPU cores, each delivered with its own ATPG patterns.', q: 'Which DFT architecture fits?', o: [{ t: 'Wrap each core (IEEE 1500) and reuse its patterns through a TAM', ok: true, w: 'Core-based test.' }, { t: 'Flatten everything and rerun ATPG for the whole chip', ok: false, w: 'Wastes the vendor patterns and ATPG time.' }, { t: 'Skip testing the cores', ok: false, w: 'Never.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'MBIST tests…', o: ['memories', 'I/O pads', 'clock trees only', 'the package'], a: 0, w: '' },
      { d: 'Easy', q: 'An OCC provides…', o: ['at-speed test clock pulses', 'power', 'memory repair', 'boundary scan'], a: 0, w: '' },
      { d: 'Easy', q: 'IEEE 1500 defines…', o: ['core test wrappers', 'Verilog', 'GDSII', 'SDC'], a: 0, w: '' },
      { d: 'Medium', q: 'Hierarchical DFT mainly helps…', o: ['ATPG size and pattern reuse', 'power delivery', 'routing', 'placement'], a: 0, w: '' },
      { d: 'Medium', q: 'Which is a DFT cost?', o: ['area and test time', 'better coverage', 'faster ATPG', 'fewer defects'], a: 0, w: '' },
      { d: 'Medium', q: 'A TAM is…', o: ['a test access mechanism carrying patterns to cores', 'a memory', 'a clock', 'a power ring'], a: 0, w: '' },
      { d: 'Medium', q: 'LBIST is especially useful for…', o: ['in-field self-test', 'reducing area', 'memory repair', 'routing'], a: 0, w: '' },
      { d: 'Hard', q: 'Why plan DFT at architecture time?', o: ['pins, clocks, memories and IP choices constrain test later', 'it is optional', 'synthesis decides it', 'it is free'], a: 0, w: '' },
      { d: 'Hard', q: 'Without compression, a 120k-flop core on 8 chains needs about how many shift cycles per pattern?', o: ['15,000', '1,500', '960,000', '120'], a: 0, w: '120,000 / 8.' },
      { d: 'Hard', q: 'Which block lets JTAG start MBIST and read its result?', o: ['IJTAG network', 'OCC', 'EDT', 'wrapper cells'], a: 0, w: '' }
    ]
  });
})();
