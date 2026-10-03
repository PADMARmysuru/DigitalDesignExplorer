/* Level 10 · Module 3 – Power Planning */
(function () {
  'use strict';
  var L = window.L7, S = L.svg, T = L.t, R = L.rect, P = L.path;
  var C = 16, RW = 10;                                     // core grid for the IR-drop map

  /* simplified physical model of a power grid (illustrative units → % of VDD) */
  function solve(g) {
    var straps = [], i;
    for (i = 0; i < g.straps; i++) straps.push((i + 0.5) * C / g.straps);
    var rs = (g.layer === 'top' ? 0.05 : 0.16) / g.width;          // strap resistance per row
    var ringDrop = g.ring ? 2.0 / g.pads : 7.0 / g.pads;          // pads → ring (or pads → strap ends)
    var map = [], worst = 0, sum = 0;
    for (var y = 0; y < RW; y++) {
      map.push([]);
      var vy = g.ring ? Math.min(y + 0.5, RW - y - 0.5) : (y + 0.5);   // distance along the strap to a supply end
      for (var x = 0; x < C; x++) {
        var dx = straps.length ? Math.min.apply(null, straps.map(function (s) { return Math.abs(x + 0.5 - s); })) : Math.min(x + 0.5, C - x - 0.5) * (g.ring ? 1 : 2);
        var d = ringDrop + rs * vy * (straps.length ? 6 / straps.length : 6) + 0.11 * dx * dx;
        map[y].push(d); worst = Math.max(worst, d); sum += d;
      }
    }
    var current = straps.length ? 100 / (straps.length * g.width) : 100;   // relative current per strap
    var em = straps.length ? (g.layer === 'top' ? current / 18 : current / 7) : 9;
    var tracks = Math.round(g.straps * g.width * (g.layer === 'top' ? 1.2 : 2.6));     // % of routing tracks used
    return { map: map, worst: worst, avg: sum / (C * RW), em: em, tracks: tracks };
  }

  /* ---------- Widget: build a power grid ---------- */
  function gridLab(root, api) {
    var lab = L.h('div', 'l7-lab', '<div class="l7-lab-bar"><i></i>Power grid lab · power pads → ring → straps → rails → cells</div>');
    var body = L.h('div', 'l7-lab-body'); lab.appendChild(body); root.appendChild(lab);
    var g = { pads: 1, ring: false, straps: 0, width: 1, layer: 'low' }, done = false;
    var gr = L.h('div', 'l7-grid2'); body.appendChild(gr);
    var c1 = L.h('div', ''), c2 = L.h('div', ''); gr.appendChild(c1); gr.appendChild(c2);
    L.slider(c1, 'Power pads (VDD/VSS pairs)', 1, 8, 1, g.pads, null, function (v) { g.pads = v; draw(); });
    var rr = L.h('div', 'l7-row'); c1.appendChild(rr);
    var bRing = L.btn('Core power ring: OFF', '', function () { g.ring = !g.ring; draw(); }); rr.appendChild(bRing);
    L.slider(c2, 'Vertical straps', 0, 12, 1, g.straps, null, function (v) { g.straps = v; draw(); });
    L.slider(c2, 'Strap width', 1, 4, 1, g.width, function (v) { return v + '×'; }, function (v) { g.width = v; draw(); });
    var lr = L.h('div', 'l7-row'); c1.appendChild(lr);
    L.select(lr, 'Strap metal', [['low', 'Thin lower metal (M3)'], ['top', 'Thick top metal (M7)']], g.layer, function (v) { g.layer = v; draw(); });
    var pic = L.h('div', 'l7-svgbox'); body.appendChild(pic);
    var out = L.h('div', 'l7-readout'); body.appendChild(out);
    var verdict = L.h('div', 'l7-verdict'); body.appendChild(verdict);
    function col(p) { var t = Math.min(1, p / 10); var r = Math.round(52 + 203 * t), gg = Math.round(199 - 150 * t), b = Math.round(89 - 50 * t); return 'rgb(' + r + ',' + gg + ',' + b + ')'; }
    function draw() {
      bRing.innerHTML = 'Core power ring: ' + (g.ring ? 'ON' : 'OFF'); bRing.classList.toggle('is-on', g.ring);
      var r = solve(g), W = 30, OX = 50, OY = 40, o = '';
      o += R(6, 6, C * W + 88, RW * 22 + 70, 'box', 10);
      for (var y = 0; y < RW; y++) for (var x = 0; x < C; x++) o += '<rect x="' + (OX + x * W) + '" y="' + (OY + y * 22) + '" width="' + (W - 1) + '" height="21" fill="' + col(r.map[y][x]) + '" opacity=".55"/>';
      for (y = 0; y <= RW; y++) o += '<line x1="' + OX + '" x2="' + (OX + C * W) + '" y1="' + (OY + y * 22) + '" y2="' + (OY + y * 22) + '" stroke="' + (y % 2 ? '#e5332a' : '#0071e3') + '" stroke-width="1" opacity=".5"/>';
      if (g.ring) o += '<rect x="' + (OX - 14) + '" y="' + (OY - 14) + '" width="' + (C * W + 28) + '" height="' + (RW * 22 + 28) + '" fill="none" stroke="#0071e3" stroke-width="5"/><rect x="' + (OX - 22) + '" y="' + (OY - 22) + '" width="' + (C * W + 44) + '" height="' + (RW * 22 + 44) + '" fill="none" stroke="#e5332a" stroke-width="5"/>';
      for (var i = 0; i < g.straps; i++) { var sx = OX + (i + 0.5) * C * W / g.straps; o += '<line x1="' + sx + '" x2="' + sx + '" y1="' + (OY - (g.ring ? 14 : 0)) + '" y2="' + (OY + RW * 22 + (g.ring ? 14 : 0)) + '" stroke="' + (g.layer === 'top' ? '#3a62c7' : '#7aa7ff') + '" stroke-width="' + (2 + g.width * 2) + '"/>'; }
      for (i = 0; i < g.pads; i++) { var px = OX + (i + 0.5) * C * W / g.pads; o += '<rect x="' + (px - 9) + '" y="8" width="18" height="12" rx="2" fill="#ff9500"/>'; if (!g.ring && g.straps) o += ''; }
      o += T(OX, OY + RW * 22 + 44, 'pads (orange) · ring · straps (blue) · rails along every row · colour = IR drop', 't-dim t-sm', 'start');
      pic.innerHTML = S(C * W + 100, RW * 22 + 84, o, 'Power grid with IR drop map');
      var irOk = r.worst <= 5, emOk = r.em <= 1, trOk = r.tracks <= 22;
      out.innerHTML = '<span class="k">Worst IR drop</span> <span class="' + (irOk ? 'v' : 'c') + '">' + r.worst.toFixed(1) + ' % of VDD</span> (target ≤ 5 %) · <span class="k">average</span> ' + r.avg.toFixed(1) + ' %' +
        '<br><span class="k">Electromigration stress</span> <span class="' + (emOk ? 'v' : 'c') + '">' + (r.em * 100).toFixed(0) + ' %</span> of the limit · <span class="k">routing tracks used by power</span> <span class="' + (trOk ? 'v' : 'c') + '">' + r.tracks + ' %</span> (keep ≤ 22 %)';
      var probs = [];
      if (!irOk) probs.push('IR drop ' + r.worst.toFixed(1) + ' %: cells far from the supply see a lower VDD and become slower. ' + (!g.straps ? 'Without straps, current flows the whole length of the thin rails.' : !g.ring ? 'Without a ring, straps are fed from one end only.' : 'Add straps or pads, or use wider / thicker metal.'));
      if (!emOk) probs.push('Electromigration: too much current per strap – metal atoms are pushed along the wire and it can fail over the years. Use more, wider or thicker straps.');
      if (!trOk) probs.push('The power grid takes ' + r.tracks + ' % of the routing tracks: signal routing will be congested. Use fewer, thicker top-metal straps.');
      verdict.className = 'l7-verdict ' + (probs.length ? 'bad' : 'ok');
      verdict.innerHTML = probs.length ? '⚠️ Power grid not good enough<small>' + probs.join('<br>') + '</small>' : '✅ Robust power grid<small>Low IR drop everywhere, safe current density and most routing tracks left for signals.</small>';
      if (!probs.length && !done) { done = true; api.done(); }
    }
    draw();
  }

  /* ---------- Widget: which cells see the worst IR drop? ---------- */
  function irDrill(root, api) {
    L.drill(root, api, {
      bar: 'Power-grid diagnosis', label: 'Situation', fixed: false,
      items: [
        { q: 'A ring and 8 straps exist, but the IR-drop map is red only in the middle of the core between two straps that are far apart.', o: ['Add a strap between them (closer strap pitch)', 'Remove the ring', 'Increase utilisation', 'Use more I/O pins'], a: 0, w: 'Rails carry current horizontally only between straps; a large strap pitch gives a hot spot in between.' },
        { q: 'IR drop is low everywhere except near one corner, far from the only power pad.', o: ['Add power pads around the die', 'Make the core larger', 'Remove straps', 'Move the clock pin'], a: 0, w: 'More pads shorten the path from the package to the ring.' },
        { q: 'A strap on thin lower metal shows electromigration warnings.', o: ['Widen it or move it to thick top metal', 'Make it longer', 'Remove vias', 'Lower the clock frequency only'], a: 0, w: 'Current density = current / cross-section: a wider or thicker wire carries more safely.' },
        { q: 'After adding 30 wide straps, IR drop is perfect but routing fails with many overflows.', o: ['Use fewer, thicker top-metal straps – power is eating signal tracks', 'Add even more straps', 'Increase utilisation', 'Remove the power ring'], a: 0, w: 'Every strap blocks routing tracks: power planning is a trade-off.' },
        { q: 'Standard cells in one row have no VDD connection in the layout.', o: ['The row rail is not connected to a strap/ring (missing vias)', 'The clock tree is missing', 'Utilisation is too low', 'The die is too big'], a: 0, w: 'Rails must be stitched to the straps with vias, or the row floats – LVS/ERC will flag it.' }
      ]
    });
  }

  function pdnFrame(k) {
    var o = '';
    o += R(40, 30, 340, 150, 'box', 6);
    if (k >= 0) for (var p = 0; p < 4; p++) o += '<rect x="' + (70 + p * 80) + '" y="10" width="20" height="14" rx="2" fill="#ff9500"/>';
    if (k >= 1) o += '<rect x="52" y="42" width="316" height="126" fill="none" stroke="#0071e3" stroke-width="5"/><rect x="60" y="50" width="300" height="110" fill="none" stroke="#e5332a" stroke-width="5"/>';
    if (k >= 2) for (var s = 0; s < 5; s++) o += '<line x1="' + (100 + s * 55) + '" x2="' + (100 + s * 55) + '" y1="46" y2="164" stroke="#3a62c7" stroke-width="5"/>';
    if (k >= 3) for (var r = 0; r < 7; r++) o += '<line x1="62" x2="358" y1="' + (62 + r * 15) + '" y2="' + (62 + r * 15) + '" stroke="' + (r % 2 ? '#e5332a' : '#0071e3') + '" stroke-width="1.5"/>';
    if (k >= 4) for (var c = 0; c < 9; c++) o += '<rect x="' + (72 + c * 30) + '" y="64" width="20" height="13" rx="2" fill="#34c759" opacity=".85"/>';
    o += T(400, 60, ['Power pads bring VDD and VSS from the package', 'A ring of VDD/VSS around the core', 'Straps on thick upper metal across the core', 'Rails on metal 1 along every row', 'Every standard cell taps the rails'][k], 't-vio t-b t-sm', 'start');
    o += T(400, 84, ['more pads = lower resistance', 'distributes current evenly', 'connected to the ring at both ends', 'alternate VDD / VSS (cells flip)', 'through its built-in power pins'][k], 't-dim t-sm', 'start');
    return S(600, 196, o, 'Power distribution network');
  }

  L.module({
    n: 3,
    lead: 'Every one of millions of cells needs a solid VDD and VSS connection. Learn how the power distribution network is built physically – pads, rings, straps and rails – and why a weak grid causes IR drop and electromigration.',
    tags: ['PDN', 'VDD / VSS', 'power rings', 'straps', 'power grid', 'cell rails', 'IR drop', 'electromigration'],
    sections: [
      {
        id: 'st-pdn', type: 'steps', title: 'Animation: building the power distribution network', nav: 'Build the PDN',
        frames: [0, 1, 2, 3, 4].map(function (k) { return { t: ['<b>Power pads</b> connect the package supply to the die.', 'A <b>core ring</b> surrounds the core on two thick metal layers (VDD and VSS).', '<b>Straps</b> (stripes) cross the core and connect to the ring on both ends, forming a grid with horizontal straps on another layer.', '<b>Rails</b> on metal 1 run along every standard-cell row; vias stitch them to the straps.', 'Each standard cell is designed with its VDD/VSS pins on the row boundaries, so it touches the rails automatically.'][k], svg: pdnFrame(k) }; })
      },
      {
        id: 'c-pdn', type: 'concept', title: 'The power distribution network', nav: 'PDN',
        html: '<p>The PDN carries current from the package to every cell with as little voltage loss as possible. It is built during floorplanning, before placement, so that placement can respect it.</p>' +
          '<div class="l7-grid2"><div class="l7-box sig"><h4>Upper metals</h4><p>ring and straps: thick, low-resistance metal, wide wires</p></div><div class="l7-box cu"><h4>Lower metals</h4><p>rails along the rows and vias down to the cells</p></div></div>' +
          '<p style="margin-top:12px">(How much power the design consumes was covered in Level 8. Here the question is: <i>how do we deliver it physically?</i>)</p>'
      },
      { id: 'w-grid', type: 'widget', title: 'Power grid lab', nav: 'Grid lab', intro: 'Start from a bare core with a single pad. Add a ring, straps and pads, and choose the strap metal, until IR drop, electromigration and routing usage are all acceptable.', build: gridLab },
      {
        id: 'c-ir', type: 'concept', title: 'IR drop and electromigration – introduction', nav: 'IR drop & EM',
        html: '<div class="l7-grid2"><div class="l7-box cu"><h4>IR drop</h4><p>Current I through the grid\'s resistance R lowers the supply seen by the cells: V_cell = VDD − I·R. A few percent is normal; too much slows cells (timing failures) and reduces noise margins. Typical budget: ≤ 5 % of VDD.</p></div><div class="l7-box vio"><h4>Electromigration (EM)</h4><p>High current density gradually moves metal atoms, thinning a wire until it opens (or bulges and shorts) after months or years. Limit the current per wire width; use wider wires and more vias.</p></div></div>' +
          '<div class="l7-eq">IR drop ∝ current × resistance      resistance ∝ length / (width × thickness)      EM risk ∝ current / (width × thickness)</div>'
      },
      { id: 'w-irq', type: 'widget', title: 'Power-grid diagnosis', nav: 'Diagnosis', intro: 'Read each power-grid situation and choose the best physical fix.', build: irDrill },
      {
        id: 'c-chal', type: 'concept', title: 'Power distribution challenges', nav: 'Challenges',
        html: '<div class="l7-table-wrap"><table class="l7-table"><tr><th>Challenge</th><th>Physical cause</th><th>Typical remedy</th></tr>' +
          '<tr><td>Static IR drop</td><td>average current through grid resistance</td><td>more / wider straps, more pads</td></tr>' +
          '<tr><td>Dynamic IR drop</td><td>many cells switching at once (e.g. clock edges)</td><td>decoupling capacitor cells, denser grid near hot spots</td></tr>' +
          '<tr><td>Electromigration</td><td>high current density in narrow wires and vias</td><td>wider wires, via arrays</td></tr>' +
          '<tr><td>Routing loss</td><td>straps occupy tracks</td><td>use top metals, balance strap pitch</td></tr>' +
          '<tr><td>Macro power hook-up</td><td>macros have their own power pins</td><td>dedicated rings or straps over the macro</td></tr></table></div>'
      },
      {
        id: 'rv-3', type: 'reveal', title: 'Click to reveal: power planning insights', nav: 'Reveal',
        items: [
          { q: 'Why do VDD and VSS rails alternate between rows?', a: 'Standard cells are flipped in every second row, so each rail is shared by the two rows on either side.' },
          { q: 'Why build the power grid before placement?', a: 'Straps and rails define where cells may sit and which tracks are free for signals; placement and routing must respect them.' },
          { q: 'What is a decap cell?', a: 'A filler-like cell containing a capacitor between VDD and VSS that supplies charge locally during sudden current demand, reducing dynamic IR drop.' },
          { q: 'Why use the thickest metals for power?', a: 'Lower resistance per length – less IR drop – and higher current capacity for EM.' },
          { q: 'Can a design have too much power grid?', a: 'Yes: straps occupy routing tracks and area, causing congestion. The grid is a compromise.' },
          { q: 'What does IR drop do to timing?', a: 'A lower supply makes cells slower, so paths in IR-drop hot spots may fail timing.' }
        ]
      },
      {
        id: 'dd-3', type: 'drag', title: 'Drag & drop: which part of the PDN?', nav: 'Drag & drop',
        bins: ['Pads / ring', 'Straps', 'Rails / cell hook-up'],
        items: [['Brings supply from the package', 0], ['Loop of VDD/VSS around the core', 0], ['Thick stripes across the core', 1], ['Connect to the ring at both ends', 1], ['Run along each row on metal 1', 2], ['Shared by two flipped rows', 2], ['Vias down to standard-cell power pins', 2]]
      },
      {
        id: 'calc3', type: 'calc', title: 'Power-grid calculations', nav: 'Calculate',
        items: [
          { q: 'VDD = 0.9 V and the budget is 5 % IR drop. What is the maximum allowed drop (mV)?', a: 45, h: '0.05 × 0.9 V.', s: '<b>45 mV</b>.' },
          { q: 'A strap carries 20 mA through 1.5 Ω. What is its IR drop (mV)?', a: 30, h: 'V = I × R.', s: '0.02 × 1.5 = <b>30 mV</b>.' },
          { q: 'Doubling a strap\'s width changes its resistance by what factor (as a decimal)?', a: 0.5, h: 'R ∝ 1 / width.', s: '<b>0.5×</b>.' },
          { q: 'A core is 600 µm wide with straps every 50 µm. How many straps (count both edges as straps)?', a: 13, h: '600 / 50 + 1.', s: '<b>13</b>.' },
          { q: 'The EM limit is 2 mA per µm of width. Minimum width (µm) for a wire carrying 9 mA?', a: 4.5, h: '9 / 2.', s: '<b>4.5 µm</b>.' }
        ]
      },
      {
        id: 'mcq3', type: 'mcq', title: 'Multiple-choice practice', nav: 'MCQ',
        items: [
          { q: 'The core power ring is…', o: ['a VDD/VSS loop around the core', 'a clock buffer', 'a routing blockage', 'a macro'], a: 0, w: '' },
          { q: 'IR drop is caused by…', o: ['current flowing through grid resistance', 'too many pins', 'clock skew', 'high utilisation only'], a: 0, w: '' },
          { q: 'Electromigration is reduced by…', o: ['wider / thicker wires', 'longer wires', 'fewer vias', 'thinner metal'], a: 0, w: '' },
          { q: 'Standard cells connect to power through…', o: ['row rails', 'clock trees', 'I/O pins directly', 'scan chains'], a: 0, w: '' }
        ]
      },
      {
        id: 'short3', type: 'short', title: 'Short-answer questions', nav: 'Short answer',
        items: [
          { q: 'Describe the structure of a typical power distribution network from the pads to the cells.', k: ['pad', 'ring', 'strap|stripe|grid', 'rail', 'via'], m: 'Power pads bring VDD and VSS onto the die; a core ring on thick metal surrounds the core; straps (a grid of stripes on upper metals) cross the core and connect to the ring; rails on metal 1 run along every row and are stitched to the straps with vias; standard cells have their power pins on the row boundaries and connect to the rails.' },
          { q: 'Explain IR drop and two ways to reduce it in the power grid.', k: ['current|i', 'resistance|r', 'voltage|vdd|lower', 'strap|wider|pad|thick'], m: 'IR drop is the voltage lost when current flows through the resistance of the power grid, so cells far from the supply see less than VDD and become slower. It is reduced by lowering the resistance: more or wider straps (closer pitch), thicker top metals, more power pads, and decap cells for dynamic drop.' }
        ]
      },
      {
        id: 'scen3', type: 'scen', title: 'Scenario-based questions', nav: 'Scenarios',
        items: [
          { s: 'Timing passes at the nominal supply, but sign-off shows a hot spot with 9 % IR drop and failing paths in that region.', q: 'Best response?', o: [{ t: 'Strengthen the local grid (extra straps / vias, decaps) and re-run IR and timing analysis', ok: true, w: 'Fix the cause: the supply in that region.' }, { t: 'Ignore it – nominal timing passed', ok: false, w: 'Cells there run at a lower voltage.' }, { t: 'Remove the clock tree', ok: false, w: 'Unrelated.' }] },
          { s: 'Routing is congested everywhere and the power grid uses 35 % of the routing tracks on metal 2–5.', q: 'What should you change?', o: [{ t: 'Move straps to thick top metals with a wider pitch, freeing lower-metal tracks', ok: true, w: 'Rebalance the PDN.' }, { t: 'Add more straps on metal 2', ok: false, w: 'Worse congestion.' }, { t: 'Increase utilisation', ok: false, w: 'Worse congestion.' }] }
        ]
      }
    ],
    quiz: [
      { d: 'Easy', q: 'PDN stands for…', o: ['Power Distribution Network', 'Placement Density Number', 'Physical Design Netlist', 'Pin Drive Node'], a: 0, w: '' },
      { d: 'Easy', q: 'Straps are usually on…', o: ['thick upper metals', 'polysilicon', 'diffusion', 'the package'], a: 0, w: '' },
      { d: 'Easy', q: 'Which supplies current from the package?', o: ['power pads', 'clock buffers', 'filler cells', 'vias only'], a: 0, w: '' },
      { d: 'Medium', q: 'VDD = 1.0 V, budget 5 %. Maximum IR drop =', o: ['5 mV', '50 mV', '500 mV', '0.5 mV'], a: 1, w: '' },
      { d: 'Medium', q: 'A hot spot midway between two distant straps is fixed by…', o: ['reducing strap pitch', 'removing the ring', 'raising utilisation', 'fewer pads'], a: 0, w: '' },
      { d: 'Medium', q: '15 mA through 2 Ω gives an IR drop of…', o: ['7.5 mV', '30 mV', '13 mV', '17 mV'], a: 1, w: '' },
      { d: 'Medium', q: 'Electromigration is a…', o: ['long-term reliability failure from high current density', 'timing violation', 'DRC spacing error', 'clock problem'], a: 0, w: '' },
      { d: 'Hard', q: 'Why can adding many straps hurt the design?', o: ['they consume routing tracks → congestion', 'they increase IR drop', 'they remove the clock', 'they cause latches'], a: 0, w: '' },
      { d: 'Hard', q: 'Decap cells mainly reduce…', o: ['dynamic IR drop', 'area', 'DRC errors', 'wire length'], a: 0, w: '' },
      { d: 'Hard', q: 'Halving strap pitch (twice as many straps) mainly…', o: ['reduces the rail distance to the nearest strap', 'doubles IR drop', 'removes the need for rails', 'has no effect'], a: 0, w: '' }
    ]
  });
})();
