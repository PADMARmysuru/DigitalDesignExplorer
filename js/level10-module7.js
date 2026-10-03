/* Level 10 · Module 7 – Physical Design Challenges */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;

  var SPOTS = [
    { n: 'Congestion', x: 300, y: 120, icon: '🚦', cause: 'A dense cluster of highly connected cells next to a narrow macro channel: more wires want to pass than tracks exist.', effect: 'Detours, longer delays, unroutable nets and DRC violations.', fix: 'Spread cells (density limits, padding), widen the channel, adjust the floorplan.' },
    { n: 'Routing overflow', x: 190, y: 70, icon: '🧵', cause: 'Global routing found 14 % more demand than capacity in these gcells.', effect: 'The detailed router cannot finish: shorts and opens remain.', fix: 'Reduce local density, remove unneeded blockages, add routing layers.' },
    { n: 'Antenna effect', x: 470, y: 190, icon: '📡', cause: 'A long metal-1 wire connected only to a transistor gate collects charge during plasma etching before the upper layers connect it to a driver.', effect: 'The charge can damage the thin gate oxide – a reliability failure.', fix: 'Jump to a higher layer near the gate, or add an antenna diode.' },
    { n: 'Crosstalk', x: 120, y: 200, icon: '📶', cause: 'Two long wires run side by side at minimum spacing; switching on one couples a glitch or delay onto the other.', effect: 'Functional glitches and extra (or reduced) delay on the victim net.', fix: 'Increase spacing, insert a shield wire, reorder or shorten parallel runs.' },
    { n: 'IR drop', x: 380, y: 60, icon: '🔋', cause: 'A busy block far from power pads with a sparse strap pitch.', effect: 'Cells see a lower VDD and slow down.', fix: 'Denser straps, more pads, decap cells (Module 3).' },
    { n: 'Electromigration', x: 530, y: 80, icon: '⚡', cause: 'A narrow wire and single via carry a large clock-buffer current.', effect: 'Metal slowly wears out; opens after months or years.', fix: 'Wider wires, double/array vias, split the load.' },
    { n: 'Design-rule violation', x: 230, y: 160, icon: '📏', cause: 'Two wires closer than the minimum spacing after a manual fix.', effect: 'May short during manufacturing; the foundry will reject the layout.', fix: 'Re-route with legal spacing; re-run DRC.' },
    { n: 'Manufacturing density', x: 60, y: 100, icon: '🏭', cause: 'A large empty area with almost no metal next to dense routing.', effect: 'Uneven polishing (CMP) – metal thickness varies, causing defects.', fix: 'Insert metal fill to meet minimum and maximum density rules.' }
  ];

  /* ---------- Widget: problem map ---------- */
  function mapLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Chip problem map · tap each warning marker</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var seen = {}, cur = -1;
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var info = L.h('div', ''); body.appendChild(info);
    var fb = L.h('div', 'l7-fb'); body.appendChild(fb);
    function draw() {
      var o = R(10, 10, 580, 230, 'box', 10);
      o += '<rect x="250" y="30" width="40" height="80" rx="4" fill="#5856d6" opacity=".7"/><rect x="330" y="30" width="40" height="80" rx="4" fill="#5856d6" opacity=".7"/>' + T(310, 128, 'channel', 't-dim t-sm');
      for (var r = 0; r < 9; r++) o += '<line x1="20" x2="580" y1="' + (30 + r * 24) + '" y2="' + (30 + r * 24) + '" stroke="#ececf0"/>';
      o += '<line x1="80" x2="280" y1="195" y2="195" stroke="#0071e3" stroke-width="3"/><line x1="80" x2="280" y1="203" y2="203" stroke="#ff2d55" stroke-width="3"/>';
      o += '<line x1="400" x2="520" y1="190" y2="190" stroke="#7aa7ff" stroke-width="3"/>';
      SPOTS.forEach(function (s, i) {
        o += '<g class="click" data-i="' + i + '" role="button" tabindex="0" aria-label="' + s.n + '"><circle cx="' + s.x + '" cy="' + s.y + '" r="17" fill="' + (i === cur ? '#1d1d1f' : seen[i] ? '#34c759' : '#ff3b30') + '" class="' + (seen[i] ? '' : 'pulse') + '"/>' + T(s.x, s.y + 5, s.icon, 't-sm') + '</g>';
      });
      pic.innerHTML = S(600, 250, o, 'Chip problem map');
      L.$$('g.click', pic).forEach(function (g) { var go = function () { cur = +g.getAttribute('data-i'); seen[cur] = 1; draw(); }; g.addEventListener('click', go); g.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); }); });
      if (cur >= 0) { var s = SPOTS[cur]; info.innerHTML = '<h4 style="margin:8px 0">' + s.icon + ' ' + s.n + '</h4><div class="l7-grid3"><div class="l7-box cu"><h4>Cause</h4><p>' + s.cause + '</p></div><div class="l7-box vio"><h4>Effect</h4><p>' + s.effect + '</p></div><div class="l7-box ok"><h4>Fix</h4><p>' + s.fix + '</p></div></div>'; }
      var n = Object.keys(seen).length;
      if (n === SPOTS.length) { L.fb(fb, 'ok', '🎉 All 8 problems explored. Physical design is mostly about preventing these – and finding the rest before tape-out.'); api.done(); }
      else L.fb(fb, 'info', 'Problems explored: ' + n + ' of ' + SPOTS.length + '.');
    }
    draw();
  }

  /* ---------- Widget: crosstalk and antenna lab ---------- */
  function siLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Crosstalk & antenna lab · fix both problems</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var x = { len: 400, sp: 1, shield: false }, a = { len: 600, jump: false, diode: false }, okX = false, okA = false, done = false;
    body.appendChild(L.h('h4', '', '1 · Crosstalk between two parallel wires'));
    var g1 = L.h('div', 'l7-grid2'); body.appendChild(g1);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); g1.appendChild(c1); g1.appendChild(c2);
    L.slider(c1, 'Parallel run length', 50, 600, 50, x.len, function (v) { return v + ' µm'; }, function (v) { x.len = v; draw(); });
    L.slider(c2, 'Spacing', 1, 4, 1, x.sp, function (v) { return v + '× minimum'; }, function (v) { x.sp = v; draw(); });
    var bs = L.btn('Shield wire (grounded): OFF', '', function () { x.shield = !x.shield; draw(); }); c2.appendChild(bs);
    var px = L.h('div', 'l7-svgbox'); body.appendChild(px);
    var ox = L.h('div', 'l7-verdict'); body.appendChild(ox);
    body.appendChild(L.h('h4', '', '2 · Antenna effect on a gate input'));
    var g2 = L.h('div', 'l7-grid2'); body.appendChild(g2);
    var d1 = L.h('div', ''), d2 = L.h('div', ''); g2.appendChild(d1); g2.appendChild(d2);
    L.slider(d1, 'Metal-1 wire length attached to the gate', 50, 800, 50, a.len, function (v) { return v + ' µm'; }, function (v) { a.len = v; draw(); });
    var bj = L.btn('Jump to metal 4 near the gate: OFF', '', function () { a.jump = !a.jump; draw(); }); d2.appendChild(bj);
    var bd = L.btn('Antenna diode at the gate: OFF', '', function () { a.diode = !a.diode; draw(); }); d2.appendChild(bd);
    var pa = L.h('div', 'l7-svgbox'); body.appendChild(pa);
    var oa = L.h('div', 'l7-verdict'); body.appendChild(oa);
    function draw() {
      bs.innerHTML = 'Shield wire (grounded): ' + (x.shield ? 'ON' : 'OFF'); bs.classList.toggle('is-on', x.shield);
      bj.innerHTML = 'Jump to metal 4 near the gate: ' + (a.jump ? 'ON' : 'OFF'); bj.classList.toggle('is-on', a.jump);
      bd.innerHTML = 'Antenna diode at the gate: ' + (a.diode ? 'ON' : 'OFF'); bd.classList.toggle('is-on', a.diode);
      var noise = x.len / 600 * 32 / (x.sp * x.sp) * (x.shield ? 0.15 : 1);
      var w = 60 + x.len * 0.7, gap = 8 + x.sp * 8, o = '';
      o += '<line x1="40" x2="' + (40 + w) + '" y1="40" y2="40" stroke="#ff2d55" stroke-width="6"/>' + T(46, 30, 'aggressor (switching)', 't-sm', 'start').replace('class="', 'fill="#ff2d55" class="');
      if (x.shield) o += '<line x1="40" x2="' + (40 + w) + '" y1="' + (40 + gap / 2) + '" y2="' + (40 + gap / 2) + '" stroke="#8e8e93" stroke-width="4"/>';
      o += '<line x1="40" x2="' + (40 + w) + '" y1="' + (40 + gap) + '" y2="' + (40 + gap) + '" stroke="#0071e3" stroke-width="6"/>' + T(46, 40 + gap + 20, 'victim', 't-sig t-sm', 'start');
      var bump = Math.min(40, noise * 1.2), vx = 40 + w + 30, vy = 60;
      o += '<path d="M' + vx + ' ' + vy + 'H' + (vx + 40) + 'l12 ' + (-bump) + 'l12 ' + bump + 'H' + (vx + 120) + '" fill="none" stroke="#0071e3" stroke-width="2.5"/>' + T(vx + 60, vy + 22, 'victim glitch ' + noise.toFixed(0) + ' % VDD', noise > 10 ? 't-bad t-b t-sm' : 't-ok t-b t-sm');
      px.innerHTML = S(Math.max(600, vx + 140), 110, o, 'Crosstalk');
      okX = noise <= 10;
      ox.className = 'l7-verdict ' + (okX ? 'ok' : 'bad');
      ox.innerHTML = okX ? '✅ Coupling noise ' + noise.toFixed(0) + ' % – safe<small>Coupling capacitance grows with parallel length and falls quickly with spacing; a grounded shield absorbs most of it.</small>' : '⚠️ Coupling noise ' + noise.toFixed(0) + ' % of VDD<small>A glitch this large can flip a latch or add delay. Shorten the parallel run, space the wires or add a shield.</small>';
      var ratio = (a.jump ? Math.min(a.len, 60) : a.len) / 2.0, limit = a.diode ? 1000 : 250, o2 = '';
      o2 += R(30, 30, 50, 50, 'box-on', 6) + T(55, 60, 'gate', 't-ink t-b t-sm');
      var m1 = a.jump ? 60 : Math.min(a.len, 800) * 0.6;
      o2 += '<line x1="80" x2="' + (80 + m1) + '" y1="55" y2="55" stroke="#9ec5ff" stroke-width="6"/>';
      if (a.jump) o2 += '<rect x="136" y="49" width="10" height="12" fill="#1d1d1f"/><line x1="141" x2="' + (80 + a.len * 0.6) + '" y1="35" y2="35" stroke="#3a62c7" stroke-width="6"/><line x1="141" x2="141" y1="35" y2="55" stroke="#1d1d1f" stroke-width="3"/>' + T(200, 26, 'metal 4 (connected last)', 't-dim t-sm', 'start');
      if (a.diode) o2 += '<path d="M48 80v14M40 94h16M48 94l-8 10h16z" fill="#34c759" stroke="#34c759"/>' + T(64, 106, 'diode', 't-ok t-sm', 'start');
      o2 += T(80, 84, 'metal 1 attached during etch: ' + (a.jump ? 'short' : a.len + ' µm'), 't-dim t-sm', 'start');
      pa.innerHTML = S(600, 116, o2, 'Antenna');
      okA = ratio <= limit;
      oa.className = 'l7-verdict ' + (okA ? 'ok' : 'bad');
      oa.innerHTML = okA ? '✅ Antenna ratio ' + Math.round(ratio) + ' (limit ' + limit + ') – safe<small>' + (a.jump ? 'Jumping up to a higher layer near the gate keeps the lower-metal antenna short: the long part is connected only at the end, when the driver is already attached.' : a.diode ? 'The diode gives the collected charge a safe path to the substrate.' : 'The attached wire is short enough.') + '</small>' : '⚠️ Antenna ratio ' + Math.round(ratio) + ' > limit ' + limit + '<small>During etching, the long wire collects charge that can only discharge through the gate oxide. Jump to a higher layer near the gate or add a diode.</small>';
      if (okX && okA && !done) { done = true; api.done(); }
    }
    draw();
  }

  function siFrame(k) {
    var o = '';
    if (k === 0) { o += '<line x1="60" x2="400" y1="60" y2="60" stroke="#ff2d55" stroke-width="6"/><line x1="60" x2="400" y1="80" y2="80" stroke="#0071e3" stroke-width="6"/>'; for (var i = 0; i < 8; i++) o += '<line x1="' + (80 + i * 40) + '" x2="' + (80 + i * 40) + '" y1="63" y2="77" stroke="#8e8e93" stroke-dasharray="2 2"/>'; o += T(230, 112, 'coupling capacitance along the whole parallel run', 't-dim t-sm'); }
    if (k === 1) { o += '<path d="M60 70H200V40H400" stroke="#ff2d55" stroke-width="3" fill="none"/><path d="M60 110H220l10 -14l10 14H400" stroke="#0071e3" stroke-width="3" fill="none"/>' + T(230, 140, 'the aggressor\'s edge appears as a glitch on the quiet victim', 't-dim t-sm'); }
    if (k === 2) { o += R(60, 40, 60, 50, 'box-on', 6) + T(90, 70, 'gate', 't-ink t-sm') + '<line x1="120" x2="420" y1="65" y2="65" stroke="#9ec5ff" stroke-width="6"/>'; for (var j = 0; j < 7; j++) o += T(150 + j * 40, 50, '+', 't-bad t-b'); o += T(240, 112, 'plasma charge collects on the long wire → flows into the gate oxide', 't-dim t-sm'); }
    if (k === 3) { o += R(60, 40, 80, 60, 'box', 6) + T(100, 76, 'empty', 't-dim t-sm'); for (var r = 0; r < 6; r++) o += '<line x1="180" x2="420" y1="' + (40 + r * 10) + '" y2="' + (40 + r * 10) + '" stroke="#7aa7ff" stroke-width="5"/>'; o += T(240, 128, 'uneven metal density → uneven chemical-mechanical polishing → fill needed', 't-dim t-sm'); }
    return S(600, 150, o, 'Physical challenge');
  }

  L.module({
    n: 7,
    lead: 'A layout can be fully placed and routed and still fail. Meet the physical problems every chip designer must manage – congestion, overflow, antenna effects, crosstalk, IR drop, electromigration, design-rule and manufacturing constraints – at an undergraduate level.',
    tags: ['congestion', 'cell density', 'routing overflow', 'antenna effect', 'crosstalk', 'IR drop', 'electromigration', 'DRC', 'manufacturing'],
    sections: [
      {
        id: 'c-over', type: 'concept', title: 'Three families of physical problems', nav: 'Overview',
        html: '<div class="l7-grid3"><div class="l7-box cu"><h4>Routability</h4><p>congestion, high cell density, routing overflow</p></div><div class="l7-box vio"><h4>Signal and power integrity</h4><p>crosstalk, IR drop, electromigration</p></div><div class="l7-box sig"><h4>Manufacturability</h4><p>design rules, antenna effects, metal density, lithography limits</p></div></div>' +
          '<p style="margin-top:12px">Detailed timing and power analysis were covered in Level 8; here we look at the <b>physical causes</b> and the <b>layout fixes</b>.</p>'
      },
      { id: 'w-map', type: 'widget', title: 'Chip problem map', nav: 'Problem map', intro: 'Tap all eight warning markers on this layout to see the cause, effect and fix of each problem.', build: mapLab },
      {
        id: 'st-si', type: 'steps', title: 'Animation: crosstalk, antenna and density', nav: 'How problems arise',
        frames: [0, 1, 2, 3].map(function (k) { return { t: ['<b>Crosstalk</b>: two neighbouring wires form a capacitor along their parallel length.', 'When the aggressor switches, charge couples onto the victim: a glitch (or extra delay if both switch).', '<b>Antenna effect</b>: during manufacturing, before the upper layers exist, a long wire attached only to a gate collects charge from the plasma etch.', '<b>Metal density</b>: polishing (CMP) removes metal unevenly where density varies, so foundries require fill.'][k], svg: siFrame(k) }; })
      },
      { id: 'w-si', type: 'widget', title: 'Crosstalk & antenna lab', nav: 'SI & antenna lab', intro: 'Both problems start in an unsafe state. Use the physical fixes until both are safe.', build: siLab },
      {
        id: 'c-table', type: 'concept', title: 'Summary: causes and physical fixes', nav: 'Summary',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Problem</th><th>Typical physical cause</th><th>Layout fix</th></tr>' +
          '<tr><td>Congestion / overflow</td><td>dense placement, narrow channels</td><td>spread cells, floorplan changes, more layers</td></tr>' +
          '<tr><td>Antenna</td><td>long lower-metal wire on a gate</td><td>layer jumping, diodes</td></tr>' +
          '<tr><td>Crosstalk</td><td>long parallel runs at minimum spacing</td><td>spacing, shielding, shorter runs</td></tr>' +
          '<tr><td>IR drop</td><td>weak grid, far from pads</td><td>denser grid, pads, decaps</td></tr>' +
          '<tr><td>Electromigration</td><td>high current density</td><td>wider wires, via arrays</td></tr>' +
          '<tr><td>DRC</td><td>spacing/width/enclosure errors</td><td>legal re-routing</td></tr>' +
          '<tr><td>Density / CMP</td><td>empty or overfilled metal regions</td><td>metal fill, slotting</td></tr></table></div>'
      },
      {
        id: 'rv-7', type: 'reveal', title: 'Click to reveal: physical challenge insights', nav: 'Reveal',
        items: [
          { q: 'Why do antenna problems happen only during manufacturing?', a: 'In the finished chip the wire is connected to a driver (diffusion), which discharges it. During etching of a lower layer the upper connection does not exist yet.' },
          { q: 'Why does crosstalk get worse in advanced technologies?', a: 'Wires are taller and closer together, so side-wall coupling capacitance dominates.' },
          { q: 'Can congestion be fixed by the router alone?', a: 'Only slightly – it can detour. Real fixes are in placement and floorplanning.' },
          { q: 'Why add "dummy" metal fill?', a: 'To keep metal density within the foundry\'s window so polishing produces uniform thickness.' },
          { q: 'Is EM a timing problem?', a: 'No, a reliability problem: the chip works at first and fails later.' },
          { q: 'What is a shield wire?', a: 'A grounded (or VDD) wire routed between sensitive nets so coupling goes to the shield instead.' }
        ]
      },
      {
        id: 'dd-7', type: 'drag', title: 'Drag & drop: match the fix to the problem', nav: 'Drag & drop',
        bins: ['Antenna', 'Crosstalk', 'Congestion', 'Electromigration'],
        items: [['Add a diode at the gate', 0], ['Jump to a higher metal near the gate', 0], ['Insert a grounded shield', 1], ['Increase spacing between long parallel nets', 1], ['Lower local placement density', 2], ['Widen a narrow macro channel', 2], ['Use a wider wire', 3], ['Replace a single via with a via array', 3]]
      },
      {
        id: 'calc7', type: 'calc', title: 'Physical challenge calculations', nav: 'Calculate',
        items: [
          { q: 'Coupling capacitance is 0.08 fF/µm of parallel run. Two wires run in parallel for 250 µm. Coupling (fF)?', a: 20, h: '0.08 × 250.', s: '<b>20 fF</b>.' },
          { q: 'Doubling the spacing reduces coupling to roughly what fraction (in this simple model ∝ 1/spacing²)?', a: 0.25, h: '1 / 2².', s: '<b>0.25</b>.' },
          { q: 'Antenna ratio = metal area / gate area. Metal 900 µm², gate 2 µm². Ratio?', a: 450, h: '900 / 2.', s: '<b>450</b>.' },
          { q: 'The antenna limit is 300. What is the maximum metal area (µm²) on a 2 µm² gate?', a: 600, h: '300 × 2.', s: '<b>600 µm²</b>.' },
          { q: 'A density rule requires 20–80 % metal. A 100 × 100 µm window has 1500 µm² of metal. How much fill (µm²) is needed at minimum?', a: 500, h: '20 % of 10,000 = 2000.', s: '2000 − 1500 = <b>500 µm²</b>.' }
        ]
      },
      {
        id: 'mcq7', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'The antenna effect can damage…', o: ['gate oxide', 'the package', 'the clock source', 'the power pad'], a: 0, w: '' },
          { q: 'Crosstalk is reduced by…', o: ['spacing and shielding', 'longer parallel runs', 'thinner wires only', 'higher utilisation'], a: 0, w: '' },
          { q: 'Metal fill is added to…', o: ['meet density rules for polishing', 'reduce IR drop', 'add logic', 'shorten wires'], a: 0, w: '' },
          { q: 'Electromigration is a…', o: ['long-term reliability failure', 'setup violation', 'placement overlap', 'missing via in LVS'], a: 0, w: '' }
        ]
      },
      {
        id: 'short7', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Explain the antenna effect and two ways to fix it.', k: ['charge|plasma|etch', 'gate|oxide', 'long|metal|wire', 'diode', 'jump|higher layer|upper'], m: 'During plasma etching a long metal wire attached only to transistor gates collects charge before the upper layers connect it to a driver; the charge can only discharge through the thin gate oxide and may damage it. Fixes: jump to a higher metal layer near the gate so the lower-layer segment is short (layer hopping), or add an antenna diode that safely discharges the wire.' },
          { q: 'What is crosstalk and how can the layout reduce it?', k: ['coupl|capacit', 'neighbo|parallel|adjacent', 'glitch|noise|delay', 'spac|shield'], m: 'Crosstalk is unwanted coupling through the capacitance between neighbouring wires: when an aggressor switches it injects a glitch or changes the delay of the victim. The layout reduces it by increasing spacing, inserting grounded shield wires, shortening parallel runs, or routing sensitive nets on different layers.' }
        ]
      },
      {
        id: 'scen7', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'A clock net runs 800 µm parallel to a busy data bus at minimum spacing; the clock shows glitches.', q: 'Best fix?', o: [{ t: 'Shield the clock (or double its spacing) and shorten the parallel run', ok: true, w: 'Classic crosstalk fix.' }, { t: 'Add an antenna diode', ok: false, w: 'Different problem.' }, { t: 'Increase utilisation', ok: false, w: 'Makes it worse.' }] },
          { s: 'Antenna checks report 40 violations, all on long metal-2 nets driving distant gates.', q: 'What should the router do?', o: [{ t: 'Jump to upper metal near the gates or insert antenna diodes', ok: true, w: 'Standard antenna repair.' }, { t: 'Make the nets longer', ok: false, w: 'Worse.' }, { t: 'Remove the power grid', ok: false, w: 'Unrelated.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'Crosstalk is caused by…', o: ['coupling capacitance between neighbouring wires', 'too many pins', 'a missing clock', 'low utilisation'], a: 0, w: '' },
      { d: 'Easy', q: 'Metal fill helps meet…', o: ['density rules', 'timing', 'LVS', 'clock skew'], a: 0, w: '' },
      { d: 'Easy', q: 'Routing overflow comes from…', o: ['more wires than tracks', 'too few cells', 'too much fill', 'short clocks'], a: 0, w: '' },
      { d: 'Medium', q: 'Antenna ratio for 600 µm² of metal on a 3 µm² gate =', o: ['200', '1800', '603', '20'], a: 0, w: '' },
      { d: 'Medium', q: 'A grounded wire between two signal wires is a…', o: ['shield', 'strap', 'via', 'diode'], a: 0, w: '' },
      { d: 'Medium', q: 'Which fix addresses electromigration?', o: ['wider wire / via array', 'longer wire', 'shield wire', 'metal fill'], a: 0, w: '' },
      { d: 'Medium', q: 'IR drop is mainly a problem of…', o: ['the power distribution network', 'masks', 'the testbench', 'pins'], a: 0, w: '' },
      { d: 'Hard', q: 'Why does layer jumping fix antenna violations?', o: ['the lower-layer segment attached to the gate becomes short', 'it removes the gate', 'it adds charge', 'it shortens the clock'], a: 0, w: '' },
      { d: 'Hard', q: 'Halving spacing (∝ 1/s²) multiplies coupling by…', o: ['2', '4', '0.5', '0.25'], a: 1, w: '' },
      { d: 'Hard', q: 'Uneven metal density mainly affects…', o: ['polishing (CMP) uniformity', 'RTL simulation', 'clock gating', 'pin count'], a: 0, w: '' }
    ]
  });
})();
